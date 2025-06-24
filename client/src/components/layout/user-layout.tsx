import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import ChangePasswordModal from "@/components/modals/change-password-modal";
import { Brain, Hospital, LogOut, Key } from "lucide-react";

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              {/* Thoughts App Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Thoughts</h1>
              </div>
              
              {/* Clinic Branding */}
              {user?.clinic && (
                <div className="flex items-center space-x-3 pl-6 border-l border-gray-200">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                    {user.clinic.logoUrl ? (
                      <img 
                        src={user.clinic.logoUrl} 
                        alt="Clinic logo" 
                        className="w-full h-full object-cover rounded-lg" 
                      />
                    ) : (
                      <Hospital className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.clinic.name}</p>
                    <p className="text-xs text-gray-500">Your Clinic</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.username}</span>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">
                  {user?.username?.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowChangePassword(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                <Key className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600 mb-1">
                To change any information please contact the administrator
              </p>
              <p className="text-sm text-gray-500">
                This app is created by Ahmed El Aidy for communication and inquiries, feel free to reach out at{" "}
                <a 
                  href="https://www.linkedin.com/in/elaidy" 
                  className="text-primary hover:text-blue-600 underline" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  https://www.linkedin.com/in/elaidy
                </a>
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>© 2025 Thoughts App</span>
              <span>•</span>
              <span>All rights reserved</span>
            </div>
          </div>
        </div>
      </footer>
      
      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        user={user}
      />
    </div>
  );
}
