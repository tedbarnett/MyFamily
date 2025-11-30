import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

function generateSessionHash(): string {
  const storedHash = sessionStorage.getItem("analytics_session");
  if (storedHash) return storedHash;
  
  // Generate a simple session hash (alphanumeric only)
  const hash = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  sessionStorage.setItem("analytics_session", hash);
  return hash;
}

async function trackPageView(route: string) {
  try {
    const sessionHash = generateSessionHash();
    
    // Only send route and session hash - server derives familyId from route
    await fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route,
        sessionHash,
      }),
    });
  } catch {
    // Silently fail - analytics should never block user experience
  }
}

export function usePageTracking() {
  const [location] = useLocation();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (location !== lastTrackedRef.current) {
      lastTrackedRef.current = location;
      trackPageView(location);
    }
  }, [location]);
}
