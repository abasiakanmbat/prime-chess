/**
 * Get the API base URL based on the current app location
 * Uses the same origin as the current page, with fallback to env variable or localhost
 */
export function getApiUrl() {
  // In production or when served from same origin, use current origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // In development (Vite dev server), use proxy (relative URLs work)
    // In production, use the same origin
    // Allow override via environment variable if needed
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    // Use current origin (works for same-origin deployments)
    return origin;
  }
  
  // Fallback for SSR or when window is not available
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

/**
 * Get the full API URL for a specific endpoint
 */
export function getApiEndpoint(endpoint) {
  const apiUrl = getApiUrl();
  // Remove leading slash from endpoint if present, we'll add it
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${apiUrl}${cleanEndpoint}`;
}

