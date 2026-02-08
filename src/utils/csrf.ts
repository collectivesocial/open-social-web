/**
 * Read the CSRF token from the `csrf-token` cookie.
 * The server sets this cookie (httpOnly=false) on GET requests.
 */
export function getCsrfToken(): string | undefined {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf-token='));
  return match ? match.split('=')[1] : undefined;
}

/**
 * Returns headers that include the CSRF token for state-changing requests.
 * Merge these with any other headers you need.
 */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'x-csrf-token': token } : {};
}
