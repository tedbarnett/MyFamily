import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import Home from "@/pages/home";
import Category from "@/pages/category";
import PersonDetail from "@/pages/person-detail";
import Admin from "@/pages/admin";
import Everyone from "@/pages/everyone";
import Quiz from "@/pages/quiz";
import Birthdays from "@/pages/birthdays";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NewFamily from "@/pages/new-family";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Default routes (for backward compatibility with barnett-family) */}
      <Route path="/" component={Home} />
      <Route path="/new-family" component={NewFamily} />
      <Route path="/category/:category" component={Category} />
      <Route path="/person/:id" component={PersonDetail} />
      <Route path="/admin" component={Admin} />
      <Route path="/everyone" component={Everyone} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/birthdays" component={Birthdays} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Family-scoped routes for multi-tenant support */}
      <Route path="/:familySlug/login" component={Login} />
      <Route path="/:familySlug/register" component={Register} />
      <Route path="/:familySlug/admin" component={Admin} />
      <Route path="/:familySlug/category/:category" component={Category} />
      <Route path="/:familySlug/person/:id" component={PersonDetail} />
      <Route path="/:familySlug/everyone" component={Everyone} />
      <Route path="/:familySlug/quiz" component={Quiz} />
      <Route path="/:familySlug/birthdays" component={Birthdays} />
      <Route path="/:familySlug" component={Home} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
