import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import Home from "@/pages/home";
import Category from "@/pages/category";
import PersonDetail from "@/pages/person-detail";
import Admin from "@/pages/admin";
import Everyone from "@/pages/everyone";
import Quiz from "@/pages/quiz";
import Birthdays from "@/pages/birthdays";
import NotFound from "@/pages/not-found";
import type { Person } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/category/:category" component={Category} />
      <Route path="/person/:id" component={PersonDetail} />
      <Route path="/admin" component={Admin} />
      <Route path="/everyone" component={Everyone} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/birthdays" component={Birthdays} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Wrapper to ensure data is loaded before showing app
function AppContent() {
  // Preload the people data - this ensures it's cached before any page renders
  const { isLoading, isError } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-2xl text-muted-foreground">Loading app...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-destructive mb-2">Connection Error</p>
          <p className="text-lg text-muted-foreground">Please refresh the page</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md text-lg font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
