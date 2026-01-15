/**
 * Content filtering to prevent off-platform contact sharing
 * Protects platform commission by detecting and redacting:
 * - Email addresses
 * - Phone numbers
 * - Social media handles
 * - Suspicious keywords
 */

/**
 * Unicode normalization to prevent bypass attacks using:
 * - Fullwidth characters (ａｂｃ → abc)
 * - Homoglyphs (а[cyrillic] → a[latin])
 * - Zero-width characters
 * - Combining characters
 */
function normalizeUnicode(text: string): string {
  // First, apply NFKC normalization (canonical decomposition + compatibility composition)
  // This converts fullwidth chars to ASCII equivalents
  let normalized = text.normalize("NFKC");
  
  // Remove zero-width characters that could break up patterns
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "");
  
  // Common homoglyph replacements (Cyrillic, Greek, etc. that look like Latin)
  const homoglyphs: Record<string, string> = {
    // Cyrillic
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
    "А": "A", "Е": "E", "О": "O", "Р": "P", "С": "C", "У": "Y", "Х": "X",
    "В": "B", "Н": "H", "К": "K", "М": "M", "Т": "T",
    "і": "i", "І": "I",
    // Greek
    "α": "a", "ο": "o", "ν": "v", "ρ": "p", "τ": "t",
    // Mathematical/special
    "＠": "@", "．": ".", "：": ":", "／": "/",
    // Subscript/superscript numbers
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  };
  
  for (const [homoglyph, replacement] of Object.entries(homoglyphs)) {
    normalized = normalized.split(homoglyph).join(replacement);
  }
  
  return normalized;
}

export interface FilterResult {
  isClean: boolean;
  filteredContent: string;
  violations: Violation[];
  warningMessage?: string;
}

export interface Violation {
  type: ViolationType;
  original: string;
  position: number;
}

export type ViolationType = 
  | "EMAIL"
  | "PHONE"
  | "SOCIAL_HANDLE"
  | "SUSPICIOUS_KEYWORD"
  | "URL";

// Patterns for detection
const PATTERNS = {
  // Email: matches common email formats
  EMAIL: /[a-zA-Z0-9._%+-]+\s*[@＠]\s*[a-zA-Z0-9.-]+\s*[.．]\s*[a-zA-Z]{2,}/gi,
  
  // Email obfuscation attempts: "email at domain dot com"
  EMAIL_OBFUSCATED: /[a-zA-Z0-9._%+-]+\s+(?:at|@|AT)\s+[a-zA-Z0-9.-]+\s+(?:dot|DOT|\.)\s+[a-zA-Z]{2,}/gi,
  
  // Phone numbers - various formats
  PHONE_INTL: /\+\d{1,4}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
  PHONE_NG: /(?:0[789][01]\d{8}|0[789][01][-.\s]?\d{3,4}[-.\s]?\d{4})/g,
  PHONE_US: /(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
  PHONE_GENERIC: /(?<!\d)(?:\d{3,4}[-.\s]){2,3}\d{3,4}(?!\d)/g,
  
  // Phone obfuscation: "zero eight zero..."
  PHONE_WRITTEN: /(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine)){7,}/gi,
  
  // Social media handles
  INSTAGRAM: /(?:instagram|ig|insta)\s*[:\-]?\s*@?[a-zA-Z0-9._]{2,30}/gi,
  TWITTER: /(?:twitter|x\.com)\s*[:\-]?\s*@?[a-zA-Z0-9_]{2,30}/gi,
  WHATSAPP: /(?:whatsapp|whats\s*app|wa)\s*[:\-]?\s*[\d\s+()-]{7,}/gi,
  TELEGRAM: /(?:telegram|tg)\s*[:\-]?\s*@?[a-zA-Z0-9_]{2,30}/gi,
  FACEBOOK: /(?:facebook|fb)\s*[:\-]?\s*@?[a-zA-Z0-9._]{2,50}/gi,
  SNAPCHAT: /(?:snapchat|snap)\s*[:\-]?\s*@?[a-zA-Z0-9._]{2,30}/gi,
  
  // Generic @ handle (catches most social)
  AT_HANDLE: /@[a-zA-Z0-9._]{3,30}(?=\s|$|[.,!?])/g,
  
  // URLs (except allowed domains)
  URL: /(?:https?:\/\/|www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
};

// Suspicious keywords that suggest off-platform dealing
const SUSPICIOUS_KEYWORDS = [
  // Direct payment suggestions
  "pay me directly",
  "pay directly",
  "pay outside",
  "pay offline",
  "send money",
  "transfer money",
  "bank transfer",
  "western union",
  "moneygram",
  "pay cash",
  "cash payment",
  "pay in cash",
  
  // Contact sharing attempts
  "my email is",
  "my email:",
  "email me at",
  "contact me at",
  "reach me at",
  "my number is",
  "my phone is",
  "call me at",
  "text me at",
  "my whatsapp",
  "dm me on",
  "message me on",
  "hit me up on",
  "hmu on",
  
  // Fee avoidance
  "avoid the fee",
  "skip the fee",
  "save the commission",
  "no commission",
  "avoid commission",
  "without the platform",
  "off the platform",
  "outside the platform",
  "work directly",
  "deal directly",
];

// Redaction text
const REDACTION = "[REDACTED - Contact sharing not allowed]";

/**
 * Check if a URL is allowed (e.g., reference images on allowed platforms)
 */
function isAllowedUrl(url: string): boolean {
  const allowedDomains = [
    "cloudinary.com",
    "res.cloudinary.com",
    "imgur.com",
    "i.imgur.com",
    "pinterest.com",
    "pin.it",
    "behance.net",
    "dribbble.com",
  ];
  
  const lowerUrl = url.toLowerCase();
  return allowedDomains.some(domain => lowerUrl.includes(domain));
}

/**
 * Fallback fuzzy match redaction for when position mapping fails
 * Searches for substrings in original that normalize to the match
 */
function redactFuzzyMatch(content: string, normalizedMatch: string): string {
  // Try window-based search with increasing window sizes
  const baseLen = normalizedMatch.length;
  let result = content;
  
  for (let windowSize = baseLen; windowSize <= baseLen + 10; windowSize++) {
    for (let i = 0; i <= content.length - windowSize; i++) {
      const substr = content.substring(i, i + windowSize);
      if (normalizeUnicode(substr) === normalizedMatch) {
        result = result.replace(substr, REDACTION);
        return result; // Found and replaced
      }
    }
  }
  
  return result;
}

/**
 * Filter message content for contact information
 */
export function filterMessageContent(content: string): FilterResult {
  const violations: Violation[] = [];
  let filteredContent = content;
  
  // Normalize Unicode to prevent bypass attacks
  const normalizedContent = normalizeUnicode(content);
  
  // Track positions in normalized content to map back to original
  // We run detection on normalized but apply redaction to original
  
  // Check for email addresses
  const emailMatches = normalizedContent.match(PATTERNS.EMAIL) || [];
  const obfuscatedEmailMatches = normalizedContent.match(PATTERNS.EMAIL_OBFUSCATED) || [];
  
  [...emailMatches, ...obfuscatedEmailMatches].forEach(match => {
    violations.push({
      type: "EMAIL",
      original: match,
      position: normalizedContent.indexOf(match),
    });
    // Redact both normalized and original versions
    filteredContent = filteredContent.replace(new RegExp(escapeRegex(match), "gi"), REDACTION);
    // Also try to find the original (possibly with unicode) and redact it
    const originalPattern = findOriginalPattern(content, match);
    if (originalPattern && originalPattern !== match) {
      filteredContent = filteredContent.replace(originalPattern, REDACTION);
    } else {
      // Fallback: If position mapping failed, do aggressive substring search
      // This catches edge cases where unicode characters break mapping
      filteredContent = redactFuzzyMatch(filteredContent, match);
    }
  });
  
  // Check for phone numbers
  const phonePatterns = [
    PATTERNS.PHONE_INTL,
    PATTERNS.PHONE_NG,
    PATTERNS.PHONE_US,
    PATTERNS.PHONE_GENERIC,
    PATTERNS.PHONE_WRITTEN,
  ];
  
  phonePatterns.forEach(pattern => {
    const matches = normalizedContent.match(pattern) || [];
    matches.forEach(match => {
      // Avoid duplicate violations
      if (!violations.some(v => v.original === match)) {
        violations.push({
          type: "PHONE",
          original: match,
          position: normalizedContent.indexOf(match),
        });
        filteredContent = filteredContent.replace(new RegExp(escapeRegex(match), "gi"), REDACTION);
      }
    });
  });
  
  // Check for social media handles
  const socialPatterns = [
    { pattern: PATTERNS.INSTAGRAM, type: "SOCIAL_HANDLE" as ViolationType },
    { pattern: PATTERNS.TWITTER, type: "SOCIAL_HANDLE" as ViolationType },
    { pattern: PATTERNS.WHATSAPP, type: "SOCIAL_HANDLE" as ViolationType },
    { pattern: PATTERNS.TELEGRAM, type: "SOCIAL_HANDLE" as ViolationType },
    { pattern: PATTERNS.FACEBOOK, type: "SOCIAL_HANDLE" as ViolationType },
    { pattern: PATTERNS.SNAPCHAT, type: "SOCIAL_HANDLE" as ViolationType },
    { pattern: PATTERNS.AT_HANDLE, type: "SOCIAL_HANDLE" as ViolationType },
  ];
  
  socialPatterns.forEach(({ pattern, type }) => {
    const matches = normalizedContent.match(pattern) || [];
    matches.forEach(match => {
      if (!violations.some(v => v.original === match)) {
        violations.push({
          type,
          original: match,
          position: normalizedContent.indexOf(match),
        });
        filteredContent = filteredContent.replace(new RegExp(escapeRegex(match), "gi"), REDACTION);
      }
    });
  });
  
  // Check for URLs (except allowed ones)
  const urlMatches = normalizedContent.match(PATTERNS.URL) || [];
  urlMatches.forEach(match => {
    if (!isAllowedUrl(match)) {
      violations.push({
        type: "URL",
        original: match,
        position: normalizedContent.indexOf(match),
      });
      filteredContent = filteredContent.replace(match, REDACTION);
    }
  });
  
  // Check for suspicious keywords
  const lowerContent = content.toLowerCase();
  SUSPICIOUS_KEYWORDS.forEach(keyword => {
    if (lowerContent.includes(keyword.toLowerCase())) {
      violations.push({
        type: "SUSPICIOUS_KEYWORD",
        original: keyword,
        position: lowerContent.indexOf(keyword.toLowerCase()),
      });
      // Don't redact keywords, just flag them
    }
  });
  
  // Generate warning message
  let warningMessage: string | undefined;
  if (violations.length > 0) {
    const types = [...new Set(violations.map(v => v.type))];
    const typeMessages: Record<ViolationType, string> = {
      EMAIL: "email addresses",
      PHONE: "phone numbers",
      SOCIAL_HANDLE: "social media handles",
      SUSPICIOUS_KEYWORD: "off-platform payment language",
      URL: "external links",
    };
    
    const detected = types.map(t => typeMessages[t]).join(", ");
    warningMessage = `Your message contained ${detected} which have been redacted. ` +
      `To protect both parties, all communication and payments must stay on the platform.`;
  }
  
  return {
    isClean: violations.length === 0,
    filteredContent: violations.length > 0 ? filteredContent : content,
    violations,
    warningMessage,
  };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a character-by-character mapping from original to normalized positions
 * Returns an array where index i contains the normalized position for original char i
 */
function buildPositionMap(original: string): { origToNorm: number[]; normToOrig: number[] } {
  const origToNorm: number[] = [];
  const normToOrig: number[] = [];
  
  let normPos = 0;
  
  for (let i = 0; i < original.length; i++) {
    const char = original[i];
    const normalizedChar = normalizeUnicode(char);
    
    origToNorm.push(normPos);
    
    // Map each normalized character back to the original position
    for (let j = 0; j < normalizedChar.length; j++) {
      normToOrig.push(i);
    }
    
    normPos += normalizedChar.length;
  }
  
  // Add end position
  origToNorm.push(normPos);
  
  return { origToNorm, normToOrig };
}

/**
 * Find the original (possibly Unicode-obfuscated) pattern in the original content
 * by using precise character position mapping after normalization
 */
function findOriginalPattern(originalContent: string, normalizedMatch: string): string | null {
  const normalized = normalizeUnicode(originalContent);
  const matchIndex = normalized.indexOf(normalizedMatch);
  
  if (matchIndex === -1) return null;
  
  const matchEnd = matchIndex + normalizedMatch.length;
  
  // Build position mapping
  const { normToOrig } = buildPositionMap(originalContent);
  
  // Handle edge cases
  if (matchIndex >= normToOrig.length || matchEnd > normToOrig.length) {
    // Fallback: return null if mapping fails
    return null;
  }
  
  // Find the original start and end positions
  const origStart = normToOrig[matchIndex];
  // For end position, we need the position AFTER the last matched character
  const origEnd = matchEnd < normToOrig.length 
    ? normToOrig[matchEnd] 
    : originalContent.length;
  
  // Ensure we don't go out of bounds
  if (origStart === undefined || origEnd === undefined) {
    return null;
  }
  
  // Return the original substring
  const result = originalContent.substring(origStart, origEnd);
  
  // Verify the result normalizes to our match (sanity check)
  if (normalizeUnicode(result) !== normalizedMatch) {
    // If normalization doesn't match exactly, extend slightly to catch edge cases
    // This handles cases where zero-width chars are at boundaries
    for (let adjust = 1; adjust <= 3; adjust++) {
      const adjusted = originalContent.substring(
        Math.max(0, origStart),
        Math.min(originalContent.length, origEnd + adjust)
      );
      if (normalizeUnicode(adjusted).includes(normalizedMatch)) {
        return adjusted;
      }
    }
    return null;
  }
  
  return result;
}

/**
 * Check if content is suspicious (for admin alerts) without modifying it
 */
export function isSuspiciousContent(content: string): boolean {
  const result = filterMessageContent(content);
  return !result.isClean;
}

/**
 * Get a summary of violations for admin logging
 */
export function getViolationSummary(violations: Violation[]): string {
  if (violations.length === 0) return "No violations";
  
  const counts: Record<string, number> = {};
  violations.forEach(v => {
    counts[v.type] = (counts[v.type] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
}
