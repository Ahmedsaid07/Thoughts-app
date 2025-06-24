import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EditClinicModal from "@/components/modals/edit-clinic-modal";
import EditUserModal from "@/components/modals/edit-user-modal";
import ChangePasswordModal from "@/components/modals/change-password-modal";
import DepartmentManagementModal from "@/components/modals/department-management-modal";
import ThoughtHistoryModal from "@/components/modals/thought-history-modal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Hospital, Users, Plus, Edit, Trash2, Key, CheckCircle, MessageSquare, Settings, BarChart3 } from "lucide-react";
import type { User, Clinic, ThoughtWithAuthor } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();
  const [showEditClinic, setShowEditClinic] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDepartmentManagement, setShowDepartmentManagement] = useState(false);
  const [showThoughtHistory, setShowThoughtHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedThought, setSelectedThought] = useState<ThoughtWithAuthor | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState<number>(user?.clinic?.id || 1);
  const [isCreatingClinic, setIsCreatingClinic] = useState(false);
  
  // Thought filtering states
  const [thoughtFilters, setThoughtFilters] = useState({
    startDate: "",
    endDate: "",
    userId: "__all__",
    department: "__all__",
    includeRead: true
  });

  // Get all clinics for admin selector
  const { data: allClinics = [] } = useQuery<Clinic[]>({
    queryKey: ['/api/clinics'],
    enabled: user?.role === 'admin',
  });

  // Get current clinic data
  const { data: clinic, isLoading: clinicLoading } = useQuery<any>({
    queryKey: [`/api/clinics/${selectedClinicId}`],
    enabled: !!selectedClinicId,
  });

  // Get users data for selected clinic
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users', selectedClinicId],
    queryFn: () => fetch(`/api/users?clinicId=${selectedClinicId}`, {
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }),
    enabled: !!selectedClinicId,
  });

  // Get thoughts data for selected clinic with filters
  const { data: thoughts = [], isLoading: thoughtsLoading } = useQuery<ThoughtWithAuthor[]>({
    queryKey: ['/api/thoughts', selectedClinicId, thoughtFilters],
    queryFn: () => {
      const params = new URLSearchParams({ clinicId: selectedClinicId.toString() });
      if (thoughtFilters.startDate) params.append('startDate', thoughtFilters.startDate);
      if (thoughtFilters.endDate) params.append('endDate', thoughtFilters.endDate);
      if (thoughtFilters.userId && thoughtFilters.userId !== '__all__') params.append('userId', thoughtFilters.userId);
      if (thoughtFilters.department && thoughtFilters.department !== '__all__') params.append('department', thoughtFilters.department);
      if (!thoughtFilters.includeRead) params.append('includeRead', 'false');
      
      return fetch(`/api/thoughts?${params.toString()}`, {
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error('Failed to fetch thoughts');
        return res.json();
      });
    },
    enabled: !!selectedClinicId,
  });

  // Get unread thoughts count
  const { data: unreadData } = useQuery<{count: number}>({
    queryKey: ['/api/clinics', selectedClinicId, 'unread-count'],
    queryFn: () => fetch(`/api/clinics/${selectedClinicId}/unread-count`, {
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch unread count');
      return res.json();
    }),
    enabled: !!selectedClinicId,
  });

  // Get departments for filtering
  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/clinics', selectedClinicId, 'departments'],
    queryFn: () => fetch(`/api/clinics/${selectedClinicId}/departments`, {
      credentials: 'include'
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch departments');
      return res.json();
    }),
    enabled: !!selectedClinicId,
    select: (data) => {
      // Ensure we always get an array of strings
      if (Array.isArray(data)) {
        return data.filter(item => typeof item === 'string');
      }
      return [];
    }
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = userFilter === "all" || u.role === userFilter;
    return matchesSearch && matchesFilter;
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditUser(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setShowChangePassword(true);
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  const handleDeleteUser = async (selectedUser: User) => {
    if (selectedUser.id === user?.id) {
      toast({
        title: "Error",
        description: "Cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete user "${selectedUser.username}"? This action cannot be undone.`)) {
      await deleteUserMutation.mutateAsync(selectedUser.id);
    }
  };

  const handleDeleteThought = async (thought: ThoughtWithAuthor) => {
    if (confirm(`Are you sure you want to delete this thought? This action cannot be undone.`)) {
      try {
        await apiRequest("DELETE", `/api/thoughts/${thought.id}`);
        toast({
          title: "Success",
          description: "Thought deleted successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/thoughts', selectedClinicId] });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete thought",
          variant: "destructive",
        });
      }
    }
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (thoughtId: number) => {
      await apiRequest("PATCH", `/api/thoughts/${thoughtId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts'] });
    },
  });

  const handleViewThoughtHistory = (thought: ThoughtWithAuthor) => {
    setSelectedThought(thought);
    setShowThoughtHistory(true);
    
    // Mark as read if not already read
    if (!thought.isRead) {
      markAsReadMutation.mutate(thought.id);
    }
  };

  const deleteClinicMutation = useMutation({
    mutationFn: async (clinicId: number) => {
      await apiRequest("DELETE", `/api/clinics/${clinicId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics'] });
      // Reset to first available clinic or create new one
      if (allClinics.length > 1) {
        const remainingClinics = allClinics.filter(c => c.id !== selectedClinicId);
        setSelectedClinicId(remainingClinics[0]?.id || 1);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete clinic",
        variant: "destructive",
      });
    }
  });

  const handleDeleteClinic = async (clinic: Clinic) => {
    if (allClinics.length === 1) {
      toast({
        title: "Error",
        description: "Cannot delete the last clinic in the system",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete clinic "${clinic.name}"? This will delete all associated users and thoughts. This action cannot be undone.`)) {
      await deleteClinicMutation.mutateAsync(clinic.id);
    }
  };

  const renderContent = () => {
    switch (location) {
      case '/admin/thoughts':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Thoughts Management</h2>
            </div>
            
            {/* Clinic Selector */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Clinic</h3>
                    <Select value={selectedClinicId.toString()} onValueChange={(value) => setSelectedClinicId(parseInt(value))}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allClinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id.toString()}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filtering Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Thoughts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={thoughtFilters.startDate}
                      onChange={(e) => setThoughtFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={thoughtFilters.endDate}
                      onChange={(e) => setThoughtFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">User</label>
                    <Select value={thoughtFilters.userId} onValueChange={(value) => setThoughtFilters(prev => ({ ...prev, userId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All users</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.username} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select value={thoughtFilters.department} onValueChange={(value) => setThoughtFilters(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeRead"
                      checked={thoughtFilters.includeRead}
                      onChange={(e) => setThoughtFilters(prev => ({ ...prev, includeRead: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="includeRead" className="text-sm font-medium">Include read thoughts</label>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setThoughtFilters({
                      startDate: "",
                      endDate: "",
                      userId: "__all__",
                      department: "__all__",
                      includeRead: true
                    })}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Thoughts List */}
            <Card>
              <CardHeader>
                <CardTitle>All Thoughts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {thoughtsLoading ? (
                  <div className="p-6">
                    <div className="animate-pulse space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : thoughts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No thoughts submitted yet for this clinic.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Author</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {thoughts.map((thought) => (
                        <TableRow key={thought.id} className={`${thought.isDeleted ? "opacity-60 bg-red-50 dark:bg-red-950/20" : ""} ${!thought.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center relative">
                                <span className="text-primary font-semibold text-xs">
                                  {thought.author.username.slice(0, 2).toUpperCase()}
                                </span>
                                {!thought.isRead && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{thought.author.username}</div>
                                <div className="text-sm text-gray-500">{thought.author.email}</div>
                                {thought.department && (
                                  <div className="text-xs text-gray-400">Dept: {thought.department}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm text-gray-900 truncate">
                                  {thought.title || 'No title'}
                                </p>
                                {thought.isDeleted && (
                                  <Badge variant="destructive" className="text-xs">
                                    Deleted
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {thought.content}
                              </p>
                              {thought.isDeleted && thought.deletedByUser && (
                                <p className="text-xs text-red-600 mt-1">
                                  Deleted by {thought.deletedByUser.username}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary">
                                {thought.category}
                              </Badge>
                              {thought.department && (
                                <Badge variant="outline" className="text-xs">
                                  {thought.department}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {thought.createdAt ? new Date(thought.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {!thought.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsReadMutation.mutate(thought.id)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Mark as Read"
                                  disabled={markAsReadMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewThoughtHistory(thought)}
                                className="text-blue-600 hover:text-blue-700"
                                title="View History"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteThought(thought)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete Thought"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case '/admin/users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <Button onClick={() => { setSelectedUser(null); setShowEditUser(true); }} className="bg-green-600 hover:bg-green-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add User</span>
              </Button>
            </div>
            
            {/* Clinic Selector */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Clinic</h3>
                    <Select value={selectedClinicId.toString()} onValueChange={(value) => setSelectedClinicId(parseInt(value))}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allClinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id.toString()}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="user">Normal Users</SelectItem>
                        <SelectItem value="admin">Administrators</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-6">
                    <div className="animate-pulse space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary font-semibold text-sm">
                                  {u.username.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{u.username}</div>
                                <div className="text-sm text-gray-500">{u.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role === "admin" ? "Administrator" : "Normal User"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-50 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(u)}
                                className="text-primary hover:text-blue-600"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangePassword(u)}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              {u.id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={deleteUserMutation.isPending}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case '/admin/clinics':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Clinic Management</h2>
              <Button 
                onClick={() => { 
                  setSelectedClinic(null); 
                  setIsCreatingClinic(true);
                  setShowEditClinic(true); 
                }} 
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Clinic</span>
              </Button>
            </div>

            {/* Current Clinic Display */}
            {clinicLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ) : clinic ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                        {clinic.logoUrl ? (
                          <img src={clinic.logoUrl} alt="Clinic logo" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Hospital className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{clinic.name}</h3>
                        <p className="text-gray-600">{clinic.url || "No website URL"}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Created: {new Date(clinic.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="secondary" onClick={() => { setSelectedClinic(clinic); setShowEditClinic(true); }} className="flex items-center space-x-2">
                        <Edit className="w-4 h-4" />
                        <span>Edit Clinic</span>
                      </Button>
                      <Button variant="outline" onClick={() => setShowDepartmentManagement(true)} className="flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Manage Departments</span>
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeleteClinic(clinic)} className="flex items-center space-x-2" disabled={deleteClinicMutation.isPending}>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Clinic</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{clinic.userCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Active Thoughts</p>
                      <p className="text-2xl font-bold text-gray-900">{clinic.thoughtCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 relative">
                      <p className="text-sm font-medium text-gray-600">Unread Thoughts</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-gray-900">{unreadData?.count || 0}</p>
                        {(unreadData?.count || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* All Clinics List */}
            <Card>
              <CardHeader>
                <CardTitle>All Clinics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {allClinics.map((clinic) => (
                    <div key={clinic.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedClinicId(clinic.id)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{clinic.name}</h4>
                          <p className="text-sm text-gray-500">{clinic.url || 'No URL'}</p>
                        </div>
                        <Badge variant={clinic.id === selectedClinicId ? "default" : "secondary"}>
                          {clinic.id === selectedClinicId ? "Selected" : "Available"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case '/admin/settings':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Database Status</h4>
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Application Version</h4>
                  <p className="text-sm text-gray-600">v1.0.0</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Last Backup</h4>
                  <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Clinics</p>
                      <p className="text-2xl font-bold text-gray-900">{allClinics.length}</p>
                    </div>
                    <Hospital className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Thoughts</p>
                      <p className="text-2xl font-bold text-gray-900">{thoughts.length}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Activity</p>
                      <p className="text-2xl font-bold text-gray-900">Active</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clinic Selector */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Clinic</h3>
                    <Select value={selectedClinicId.toString()} onValueChange={(value) => setSelectedClinicId(parseInt(value))}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allClinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id.toString()}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => { 
                      setSelectedClinic(null); 
                      setIsCreatingClinic(true);
                      setShowEditClinic(true); 
                    }} 
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Clinic</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Thoughts</CardTitle>
                </CardHeader>
                <CardContent>
                  {thoughts.length === 0 ? (
                    <p className="text-gray-500">No thoughts submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {thoughts.slice(0, 3).map((thought) => (
                        <div key={thought.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">{thought.author.username}</p>
                          <p className="text-xs text-gray-600 truncate">{thought.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => { setSelectedUser(null); setShowEditUser(true); }}
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New User
                  </Button>
                  <Button 
                    onClick={() => { 
                      setSelectedClinic(null); 
                      setIsCreatingClinic(true);
                      setShowEditClinic(true); 
                    }}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Clinic
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <AdminLayout>
      {renderContent()}

      {/* Modals */}
      <EditClinicModal 
        open={showEditClinic} 
        onOpenChange={(open) => {
          setShowEditClinic(open);
          if (!open) {
            setSelectedClinic(null);
            setIsCreatingClinic(false);
          }
        }}
        clinic={isCreatingClinic ? null : selectedClinic}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/clinics'] });
          queryClient.invalidateQueries({ queryKey: [`/api/clinics/${selectedClinicId}`] });
        }}
      />
      <EditUserModal
        open={showEditUser}
        onOpenChange={setShowEditUser}
        user={selectedUser}
        clinicId={selectedClinicId}
      />
      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        user={selectedUser}
      />
      <DepartmentManagementModal
        open={showDepartmentManagement}
        onOpenChange={setShowDepartmentManagement}
        clinicId={selectedClinicId}
      />
      <ThoughtHistoryModal
        open={showThoughtHistory}
        onOpenChange={setShowThoughtHistory}
        thought={selectedThought}
      />
    </AdminLayout>
  );
}