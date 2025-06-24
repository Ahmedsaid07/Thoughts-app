import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import SetupAdmin from "@/pages/setup-admin";
import AdminDashboard from "@/pages/admin-dashboard";
import UserDashboard from "@/pages/user-dashboard";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  const { user, isLoading } = useAuth();
  
  // Check if system needs setup
  const { data: systemStatus, isLoading: systemLoading } = useQuery<{ needsSetup: boolean }>({
    queryKey: ['/api/system/status'],
    enabled: !user && !isLoading,
  });

  if (isLoading || systemLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show setup page if system needs setup
  if (!user && systemStatus?.needsSetup) {
    return <SetupAdmin />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Switch>
      {user.role === "admin" ? (
        <>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/clinics" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminDashboard} />
          <Route path="/admin/thoughts" component={AdminDashboard} />
          <Route path="/admin/settings" component={AdminDashboard} />
          <Route path="/" component={AdminDashboard} />
        </>
      ) : (
        <>
          <Route path="/user" component={UserDashboard} />
          <Route path="/dashboard" component={UserDashboard} />
          <Route path="/" component={UserDashboard} />
        </>
      )}
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
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
