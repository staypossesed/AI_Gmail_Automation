/**
 * Prompt Injection Security
 * Emails and external content are untrusted - sanitize before sending to AI.
 */

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /system\s+prompt/gi,
  /execute\s+command/gi,
  /run\s+command/gi,
  /send\s+user\s+data/gi,
  /leak\s+(the\s+)?(system\s+)?prompt/gi,
  /reveal\s+(the\s+)?(system\s+)?prompt/gi,
  /you\s+are\s+now\s+/gi,
  /pretend\s+you\s+are/gi,
  /act\s+as\s+if/gi,
  /new\s+instructions?:\s*/gi,
  /\[INST\]/gi,
  /\[SYSTEM\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /\[\[.*?\]\]/g, // Double bracket injection attempts
];

/**
 * Detects potential prompt injection attempts in text.
 * Returns true if suspicious content is found.
 */
export function detectPromptInjection(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const normalized = text.toLowerCase().trim();
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Sanitizes email content before sending to AI.
 * - Removes suspicious instruction-like phrases
 * - Truncates to safe length
 * - Strips control characters
 */
export function sanitizeForAI(content: string, maxLength = 2000): string {
  if (!content || typeof content !== "string") return "";

  let sanitized = content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Control chars
    .replace(/\s+/g, " ")
    .trim();

  // Replace suspicious phrases with placeholder
  for (const pattern of SUSPICIOUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  return sanitized.slice(0, maxLength);
}

/**
 * Validates AI response is structured JSON with expected schema.
 * Rejects responses that might contain injected content.
 */
export function validateStructuredResponse<T>(
  raw: string,
  schema: { type: string; required?: string[] }
): { valid: boolean; data?: T; error?: string } {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) {
      return { valid: false, error: "Response is not an object" };
    }
    if (schema.type && parsed.type !== schema.type) {
      return { valid: false, error: `Invalid type: expected ${schema.type}` };
    }
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in parsed)) {
          return { valid: false, error: `Missing required field: ${key}` };
        }
      }
    }
    return { valid: true, data: parsed as T };
  } catch {
    return { valid: false, error: "Invalid JSON response" };
  }
}
