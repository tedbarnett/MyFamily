import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Users, Copy, Check, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface CreateFamilyResponse {
  family: {
    id: string;
    slug: string;
    name: string;
    seniorName: string;
    joinCode: string;
  };
  member: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function NewFamily() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [createdFamily, setCreatedFamily] = useState<CreateFamilyResponse | null>(null);
  const [copiedField, setCopiedField] = useState<"url" | "code" | null>(null);

  const [familyName, setFamilyName] = useState("");
  const [seniorName, setSeniorName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Match backend slug sanitization exactly (from server/routes.ts)
  const sanitizeSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const slug = sanitizeSlug(familyName);
  const isValidSlug = slug.length >= 3;

  const createFamilyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/families", {
        slug,
        name: familyName.trim(),
        seniorName: seniorName.trim(),
        email: email.trim(),
        memberName: adminName.trim(),
        password,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create family");
      }
      
      return response.json() as Promise<CreateFamilyResponse>;
    },
    onSuccess: (data) => {
      setCreatedFamily(data);
      setStep("success");
      toast({
        title: "Family created!",
        description: `Welcome to ${data.family.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create family",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidSlug) {
      toast({
        title: "Family name too short",
        description: "Family name must create a URL with at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    createFamilyMutation.mutate();
  };

  const copyToClipboard = async (text: string, field: "url" | "code") => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field === "url" ? "Family URL" : "Join code"} copied to clipboard`,
    });
  };

  const getFamilyUrl = () => {
    if (!createdFamily) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/${createdFamily.family.slug}`;
  };

  if (step === "success" && createdFamily) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Welcome to {createdFamily.family.name}!</CardTitle>
            <CardDescription>
              Your family memory app is ready. Share these details with family members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Family URL (for {createdFamily.family.seniorName})</Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={getFamilyUrl()} 
                  className="font-mono text-sm"
                  data-testid="input-family-url"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(getFamilyUrl(), "url")}
                  data-testid="button-copy-url"
                >
                  {copiedField === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this URL with {createdFamily.family.seniorName} - no login required!
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Join Code (for family editors)</Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={createdFamily.family.joinCode} 
                  className="font-mono text-lg tracking-widest text-center"
                  data-testid="input-join-code"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdFamily.family.joinCode, "code")}
                  data-testid="button-copy-code"
                >
                  {copiedField === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Family members use this code to register and help manage photos & info
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                className="w-full" 
                onClick={() => setLocation(`/${createdFamily.family.slug}`)}
                data-testid="button-go-to-family"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Your Family App
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation(`/${createdFamily.family.slug}/admin`)}
                data-testid="button-go-to-admin"
              >
                Start Adding Family Members
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto p-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Your Family</CardTitle>
            <CardDescription>
              Set up a private family memory app to help your loved one remember everyone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="familyName">Family Name</Label>
                <Input
                  id="familyName"
                  placeholder="The Smith Family"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required
                  data-testid="input-family-name"
                />
                {familyName && (
                  <p className={`text-xs ${isValidSlug ? "text-muted-foreground" : "text-destructive"}`}>
                    {isValidSlug 
                      ? `Your URL will be: /${slug}` 
                      : "Family name must be at least 3 characters"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seniorName">Senior's Name (who will use the app)</Label>
                <Input
                  id="seniorName"
                  placeholder="Mom, Grandma, Dad..."
                  value={seniorName}
                  onChange={(e) => setSeniorName(e.target.value)}
                  required
                  data-testid="input-senior-name"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-4">Your Admin Account</p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Your Name</Label>
                    <Input
                      id="adminName"
                      placeholder="John Smith"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      data-testid="input-admin-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="input-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={createFamilyMutation.isPending || !isValidSlug}
                data-testid="button-create-family"
              >
                {createFamilyMutation.isPending ? "Creating..." : "Create Family"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
