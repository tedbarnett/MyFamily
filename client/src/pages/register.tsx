import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useFamilySlug } from "@/lib/use-family-slug";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, ArrowLeft } from "lucide-react";

export default function Register() {
  const { familySlug, tenantUrl } = useFamilySlug();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { authenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Compute tenant-aware URLs - preserve the URL structure the user is in
  const homePath = tenantUrl("/").replace(/\/$/, "") || "/";
  const adminPath = tenantUrl("/admin");
  const loginPath = tenantUrl("/login");

  // Redirect if already authenticated - use effect to avoid setState during render
  useEffect(() => {
    if (authenticated) {
      setLocation(adminPath);
    }
  }, [authenticated, adminPath, setLocation]);

  // Show nothing while redirecting
  if (authenticated) {
    return null;
  }

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; password: string; joinCode: string }) => {
      const response = await apiRequest("POST", `/api/families/${familySlug}/members`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation(adminPath);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    registerMutation.mutate({ email, name, password, joinCode });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-card-border px-6 py-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(homePath)}
            className="flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            Join as Family Member
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto px-4 py-8 w-full">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <UserPlus className="w-12 h-12 mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">
                Enter your information and the family join code to register
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg">
                Your Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="h-14 text-lg"
                required
                data-testid="input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-14 text-lg"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-lg">
                Create Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                className="h-14 text-lg"
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinCode" className="text-lg">
                Family Join Code
              </Label>
              <Input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="h-14 text-lg uppercase"
                required
                data-testid="input-join-code"
              />
              <p className="text-sm text-muted-foreground">
                Ask a family member for this code
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-xl font-bold"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-muted-foreground mt-6 text-sm">
          Already have an account?{" "}
          <button
            onClick={() => setLocation(loginPath)}
            className="text-primary underline"
            data-testid="link-login"
          >
            Sign in
          </button>
        </p>
      </main>
    </div>
  );
}
