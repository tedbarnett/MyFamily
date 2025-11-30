import { useLocation } from "wouter";

/**
 * Hook to reliably detect the family slug from the URL path.
 * This works around wouter's useParams() limitation with mixed static/dynamic routes.
 * 
 * MAINTAINABILITY NOTE: If you add new root-level routes to App.tsx, you must add 
 * them to the NON_FAMILY_PREFIXES array below to prevent misclassification.
 * 
 * Returns:
 * - familySlug: The family slug from the URL, or "demo-family" as default
 * - isFamilyScoped: Whether the current URL is a family-scoped route
 * - tenantUrl: Helper function to create tenant-aware URLs
 */

// All known non-family route prefixes (must match routes in App.tsx)
// UPDATE THIS LIST when adding new root-level routes
const NON_FAMILY_PREFIXES = [
  'login',
  'register', 
  'new-family', // Create new family signup
  'admin',
  'category',
  'person',
  'everyone',
  'quiz',
  'birthdays',
  'api',      // API routes
  'assets',   // Static assets
  'static',   // Static files
  'favicon',  // Favicon
  'robots',   // robots.txt
  'sitemap',  // sitemap.xml
  'health',   // Health checks
  'status',   // Status endpoints
];

export function useFamilySlug() {
  const [location] = useLocation();
  
  // Parse the pathname to extract family slug
  // Family-scoped routes look like: /family-name/...
  // Non-scoped routes look like: /login, /admin, /category/...
  
  const pathParts = location.split('/').filter(Boolean);
  
  // Check if the first path segment is a known route prefix
  const firstSegment = pathParts[0] || '';
  
  // Check if it's a non-family route (case-insensitive)
  const isNonFamilyRoute = NON_FAMILY_PREFIXES.some(
    prefix => firstSegment.toLowerCase() === prefix.toLowerCase()
  );
  
  // Also treat empty path (home page "/") as non-family route
  const isEmpty = pathParts.length === 0;
  
  // If first segment is not a known route and path is not empty, assume it's a family slug
  const isFamilyScoped = !isEmpty && !isNonFamilyRoute;
  const familySlug = isFamilyScoped ? firstSegment : "demo-family";
  
  // Helper function to create tenant-aware URLs
  const basePath = isFamilyScoped ? `/${familySlug}` : "";
  const tenantUrl = (path: string) => `${basePath}${path}`;
  
  return {
    familySlug,
    isFamilyScoped,
    tenantUrl,
    basePath
  };
}
