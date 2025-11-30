import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

interface AuthMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthFamily {
  id: string;
  slug: string;
  name: string;
}

interface AuthState {
  authenticated: boolean;
  member: AuthMember | null;
  family: AuthFamily | null;
  isLoading: boolean;
  login: (email: string, password: string, familySlug: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  const { data: session, isLoading, refetch } = useQuery<{
    authenticated: boolean;
    member?: AuthMember;
    family?: AuthFamily;
  }>({
    queryKey: ["/api/auth/me"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, familySlug }: { email: string; password: string; familySlug: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { email, password, familySlug });
      return response.json();
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      setError(err.message || "Login failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const login = async (email: string, password: string, familySlug: string) => {
    setError(null);
    await loginMutation.mutateAsync({ email, password, familySlug });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated: session?.authenticated || false,
        member: session?.member || null,
        family: session?.family || null,
        isLoading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
