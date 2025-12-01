import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCurrentFamilySlug } from "./family-context";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getFamilyHeaders(): Record<string, string> {
  const slug = getCurrentFamilySlug();
  return slug ? { "X-Family-Slug": slug } : {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getFamilyHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getFamilyHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - allows refresh after cold starts
      retry: 3, // Retry three times on failure (handles cold start timeouts on iOS)
      retryDelay: (attemptIndex) => Math.min(2000 * Math.pow(2, attemptIndex), 10000), // Exponential backoff: 2s, 4s, 8s
    },
    mutations: {
      retry: 2, // Retry mutations twice
      retryDelay: 1000,
    },
  },
});
