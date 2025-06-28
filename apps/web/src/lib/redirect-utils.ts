/**
 * Validates if a path is a safe internal route to prevent open redirect attacks
 */
export function isValidInternalPath(path: string): boolean {
  return (
    path.startsWith("/") && // Must start with slash
    !path.startsWith("//") && // Prevent protocol-relative URLs
    !path.includes("://") && // No protocol
    !path.includes("@") && // No user info
    !path.includes("\\") && // No backslashes
    path.length < 2048 // Reasonable length limit
  );
}

/**
 * Sanitizes a redirect URL, returning a safe path or fallback
 */
export function getSafeRedirectUrl(
  redirectPath: string | null | undefined,
  fallback = "/editor"
): string {
  if (!redirectPath) {
    return fallback;
  }

  return isValidInternalPath(redirectPath) ? redirectPath : fallback;
}
