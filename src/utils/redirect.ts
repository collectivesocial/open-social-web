/**
 * Validates that a redirect URL is safe (relative path only).
 * Prevents open redirects by ensuring the URL:
 * - Starts with "/" (relative path)
 * - Does not start with "//" (protocol-relative URL)
 * - Does not contain a scheme (http:, https:, javascript:, etc.)
 *
 * @param url The URL to validate
 * @returns The safe URL if valid, or null if invalid
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string | null {
  // Return null if no URL provided
  if (!url) {
    return null;
  }

  const trimmedUrl = url.trim();

  // Must start with "/" to be a relative path
  if (!trimmedUrl.startsWith('/')) {
    return null;
  }

  // Prevent protocol-relative URLs like "//evil.com"
  if (trimmedUrl.startsWith('//')) {
    return null;
  }

  // Prevent URLs with schemes like "http:", "https:", "javascript:", "data:", etc.
  // Check if there's a colon before the first slash
  const firstSlashIndex = trimmedUrl.indexOf('/');
  const colonIndex = trimmedUrl.indexOf(':');

  if (colonIndex !== -1 && (firstSlashIndex === -1 || colonIndex < firstSlashIndex)) {
    return null;
  }

  // URL is safe - it's a relative path
  return trimmedUrl;
}
