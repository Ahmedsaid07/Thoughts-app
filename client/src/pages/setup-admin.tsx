import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Building2 } from "lucide-react";
import { setupAdminSchema, type SetupAdminData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function SetupAdmin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SetupAdminData>({
    resolver: zodResolver(setupAdminSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      clinicName: "",
      clinicUrl: "",
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: SetupAdminData) => {
      const response = await fetch("/api/system/setup", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Setup failed");
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // Auto-login the newly created admin
      try {
        await login({
          username: form.getValues("username"),
          password: form.getValues("password")
        });
        setLocation("/admin");
      } catch (error) {
        // If auto-login fails, redirect to login page
        setLocation("/login");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  async function onSubmit(data: SetupAdminData) {
    setError(null);
    setupMutation.mutate(data);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Welcome to Thoughts</CardTitle>
          <CardDescription>
            Set up your clinic and create the first admin account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input
                id="clinicName"
                {...form.register("clinicName")}
                placeholder="Enter your clinic name"
                disabled={setupMutation.isPending}
              />
              {form.formState.errors.clinicName && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.clinicName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicUrl">Clinic Website (Optional)</Label>
              <Input
                id="clinicUrl"
                type="url"
                {...form.register("clinicUrl")}
                placeholder="https://your-clinic-website.com"
                disabled={setupMutation.isPending}
              />
              {form.formState.errors.clinicUrl && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.clinicUrl.message}
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Admin Account</h3>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...form.register("username")}
                  placeholder="Enter admin username"
                  disabled={setupMutation.isPending}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="Enter admin email"
                  disabled={setupMutation.isPending}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  placeholder="Enter password"
                  disabled={setupMutation.isPending}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...form.register("confirmPassword")}
                  placeholder="Confirm password"
                  disabled={setupMutation.isPending}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}