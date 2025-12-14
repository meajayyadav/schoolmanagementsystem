// src/utils/tenant.js
/**
 * Helpers to determine tenant identifier from current hostname.
 * - Returns a tenant code string (e.g., "dps", "svm") used by backend.
 * - Handles localhost fallback for development.
 * - Supports subdomain detection (e.g., school1.example.com -> "school1")
 * - Custom domain support (commented for future use)
 */

export function getHostname() {
  if (typeof window === 'undefined') return null;
  return window.location.hostname.toLowerCase();
}

/**
 * Get the main domain (base domain) from hostname
 * Example: school1.example.com -> example.com
 *          example.com -> example.com
 */
export function getMainDomain() {
  const host = getHostname();
  if (!host) return null;

  // Local dev fallback
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return null;
  }

  const parts = host.split('.');
  // If we have at least 2 parts, return the last 2 (domain.tld)
  // If we have 3+ parts, return the last 2 (subdomain.domain.tld -> domain.tld)
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return host;
}

/**
 * Check if current domain is a subdomain (not main domain or localhost)
 * Returns true if hostname has more than 2 parts (e.g., school1.example.com)
 */
export function isSubdomain() {
  const host = getHostname();
  if (!host) return false;

  // Handle localhost subdomains for local testing (e.g., dps.localhost)
  // This allows testing subdomain functionality on localhost
  if (host.endsWith('.localhost')) {
    const parts = host.split('.');
    // If it's "something.localhost" (not just "localhost"), it's a subdomain
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return true; // It's a subdomain (e.g., "dps.localhost")
    }
  }

  // Exact localhost or IP - not a subdomain
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return false;
  }

  const parts = host.split('.');
  // If we have 3+ parts, it's likely a subdomain
  // Example: 
  //   - dps.ajaytech.netlify.app (4 parts) -> subdomain
  //   - school1.example.com (3 parts) -> subdomain
  //   - ajaytech.netlify.app (3 parts) -> main domain (Netlify specific)
  //   - example.com (2 parts) -> main domain
  if (parts.length >= 3) {
    // For Netlify: ajaytech.netlify.app is the main domain (3 parts but no subdomain)
    // Check if it's a Netlify domain and if so, only treat as subdomain if 4+ parts
    if (host.includes('netlify.app') && parts.length === 3) {
      return false; // Main Netlify domain
    }
    return true; // It's a subdomain
  }
  
  return false; // 2 parts or less = main domain
}

/**
 * Check if current domain is a custom domain
 * This would require checking against a list of known custom domains
 * Currently commented for future implementation
 */
// export function isCustomDomain() {
//   const host = getHostname();
//   if (!host) return false;
//   
//   // List of known custom domains (would be fetched from backend in production)
//   const knownCustomDomains = [
//     // 'school1.com',
//     // 'school2.org',
//   ];
//   
//   // Check if host matches any custom domain exactly
//   return knownCustomDomains.includes(host);
// }

/**
 * Get tenant identifier from domain
 * - localhost/IP -> null (no tenant)
 * - subdomain.domain.tld -> subdomain (first part)
 * - domain.tld -> null (main domain, no tenant)
 * 
 * Custom domain support (commented):
 * - custom-domain.com -> would need to lookup from backend
 */
export function getTenantFromDomain() {
  const host = getHostname();
  if (!host) return null;

  // Handle localhost subdomains for local testing (e.g., dps.localhost)
  // This allows testing subdomain functionality on localhost
  if (host.endsWith('.localhost')) {
    const parts = host.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0].toLowerCase(); // Return subdomain part (e.g., "dps" from "dps.localhost")
    }
  }

  // Exact localhost or IP - no tenant
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) // plain IPv4
  ) {
    return null; // no tenant header for local dev
  }

  const parts = host.split('.');
  
  // Handle Netlify subdomains: dps.ajaytech.netlify.app (4 parts)
  // Handle regular subdomains: dps.example.com (3 parts)
  // Return the first part as subdomain if we have 3+ parts
  // Example: 
  //   - dps.ajaytech.netlify.app -> "dps"
  //   - school1.example.com -> "school1"
  if (parts.length >= 3) {
    return parts[0].toLowerCase(); // Return subdomain (first part)
  }
  
  // If it's just domain.tld (2 parts), it's the main domain - no tenant
  // Example: ajaytech.netlify.app -> null (main domain)
  //          example.com -> null (main domain)
  if (parts.length === 2) {
    return null;
  }
  
  // Single part (unlikely but handle it)
  if (parts.length === 1) {
    return null;
  }
  
  return null;
}

/**
 * CUSTOM DOMAIN SUPPORT (COMMENTED FOR FUTURE USE)
 * 
 * To enable custom domain support:
 * 1. Uncomment the isCustomDomain function above
 * 2. Uncomment the code below in getTenantFromDomain
 * 3. Implement backend API to fetch custom domain mappings
 * 4. Update tenantMiddleware.js to handle custom domains
 * 
 * Example implementation:
 * 
 * // Check if it's a custom domain first
 * if (isCustomDomain()) {
 *   // Fetch tenant from backend based on custom domain
 *   // This would require an API call or cached mapping
 *   // For now, return null and let backend handle it via host header
 *   return null; // Backend will resolve via host header
 * }
 */
