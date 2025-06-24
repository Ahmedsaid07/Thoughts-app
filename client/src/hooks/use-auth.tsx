import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User, Clinic, LoginData } from "@shared/schema";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  clinic: Clinic | null;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  // Check if user is logged in on mount
  const { isLoading: isCheckingAuth } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/me");
        const data = await response.json();
        setUser(data.user);
        return data;
      } catch (error) {
        setUser(null);
        throw error;
      }
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data: { user: AuthUser }) => {
      setUser(data.user);
      queryClient.invalidateQueries();
      // Redirect based on user role
      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      }, 100);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      await apiRequest("POST", "/api/auth/change-password", data);
    }
  });

  const login = async (data: LoginData) => {
    await loginMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    await changePasswordMutation.mutateAsync(data);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      changePassword,
      isLoading: isCheckingAuth || loginMutation.isPending || logoutMutation.isPending
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
