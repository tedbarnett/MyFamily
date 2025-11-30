import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

function generateSessionHash(): string {
  const storedHash = sessionStorage.getItem("analytics_session");
  if (storedHash) return storedHash;
  
  const hash = Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStorage.setItem("analytics_session", hash);
  return hash;
}

async function trackPageView(route: string, familyId?: string) {
  try {
    const sessionHash = generateSessionHash();
    
    await fetch("/api/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route,
        familyId: familyId || null,
        sessionHash,
      }),
    });
  } catch (error) {
    console.error("Failed to track page view:", error);
  }
}

export function usePageTracking(familyId?: string) {
  const [location] = useLocation();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (location !== lastTrackedRef.current) {
      lastTrackedRef.current = location;
      trackPageView(location, familyId);
    }
  }, [location, familyId]);
}
