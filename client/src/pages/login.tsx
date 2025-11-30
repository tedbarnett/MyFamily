import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useFamilySlug } from "@/lib/use-family-slug";
import { LogIn, ArrowLeft } from "lucide-react";

export default function Login() {
  const { familySlug, isFamilyScoped, tenantUrl } = useFamilySlug();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, authenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Compute tenant-aware URLs - preserve the URL structure the user is in
  const homePath = tenantUrl("/").replace(/\/$/, "") || "/";
  const adminPath = tenantUrl("/admin");
  const registerPath = tenantUrl("/register");

  // Redirect if already authenticated
  if (authenticated) {
    setLocation(adminPath);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password, familySlug);
      setLocation(adminPath);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
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
            Family Member Login
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto px-4 py-8 w-full">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <LogIn className="w-12 h-12 mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">
                Sign in to edit family information and photos
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-center">
                {error}
              </div>
            )}

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
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-14 text-lg"
                required
                data-testid="input-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-xl font-bold"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-muted-foreground mt-6 text-sm">
          Don't have an account?{" "}
          <button
            onClick={() => setLocation(registerPath)}
            className="text-primary underline"
            data-testid="link-register"
          >
            Register with a join code
          </button>
        </p>
      </main>
    </div>
  );
}
