import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import ChangePasswordModal from "@/components/modals/change-password-modal";
import { useLocation } from "wouter";
import { 
  Brain, 
  LayoutDashboard, 
  Hospital, 
  Users, 
  MessageSquare,
  Settings,
  Bell,
  LogOut,
  Key
} from "lucide-react";
import type { ThoughtWithAuthor } from "@shared/schema";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [location, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  // Get unread thoughts count
  const { data: unreadData } = useQuery<{count: number}>({
    queryKey: ['/api/clinics', user?.clinic?.id, 'unread-count'],
    queryFn: () => fetch(`/api/clinics/${user?.clinic?.id}/unread-count`, {
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch unread count');
      return res.json();
    }),
    enabled: !!user?.clinic?.id,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const unreadCount = unreadData?.count || 0;
  const hasNewThoughts = unreadCount > 0;

  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin", current: location === "/admin" },
    { name: "Clinic Management", icon: Hospital, href: "/admin/clinics", current: location === "/admin/clinics" },
    { name: "User Management", icon: Users, href: "/admin/users", current: location === "/admin/users" },
    { 
      name: "Thoughts", 
      icon: MessageSquare, 
      href: "/admin/thoughts", 
      current: location === "/admin/thoughts",
      badge: hasNewThoughts ? unreadCount : undefined
    },
    { name: "Settings", icon: Settings, href: "/admin/settings", current: location === "/admin/settings" },
  ];

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Thoughts</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">Admin Dashboard</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => setLocation(item.href)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                item.current
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="bg-gray-100 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{user?.username}</p>
            <p className="text-xs text-gray-600">Administrator</p>
            <Button
              variant="link"
              size="sm"
              className="mt-2 p-0 h-auto text-xs text-primary hover:underline"
              onClick={() => setShowChangePassword(true)}
            >
              Change Password
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
              <p className="text-gray-600">Manage clinic information and users</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  onClick={handleNotificationClick}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </Button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm font-medium text-blue-900">System Update</p>
                          <p className="text-xs text-blue-700 mt-1">New features available for clinic management</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <p className="text-sm font-medium text-green-900">Backup Complete</p>
                          <p className="text-xs text-green-700 mt-1">Daily backup completed successfully</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                          <p className="text-sm font-medium text-yellow-900">Maintenance Scheduled</p>
                          <p className="text-xs text-yellow-700 mt-1">System maintenance tonight at 2 AM</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <button 
                          className="text-sm text-primary hover:underline"
                          onClick={() => setShowNotifications(false)}
                        >
                          Close notifications
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
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
        </footer>
      </main>

      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        user={user ? {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          password: '',
          createdAt: null,
          clinicId: user.clinic?.id || null
        } : null}
      />
    </div>
  );
}
