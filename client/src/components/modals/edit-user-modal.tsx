import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { baseInsertUserSchema, type User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  clinicId?: number;
}

export default function EditUserModal({ open, onOpenChange, user, clinicId }: EditUserModalProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!user;
  const isEditingSelf = user && currentUser && user.id === currentUser.id;
  const canEditUsername = currentUser?.role === 'admin' && !isEditingSelf;

  const userFormSchema = baseInsertUserSchema.pick({ 
    username: true, 
    email: true, 
    password: true, 
    role: true 
  });
  
  const form = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      password: "",
      role: user?.role || "user",
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        password: "",
        role: user.role,
      });
    } else {
      form.reset({
        username: "",
        email: "",
        password: "",
        role: "user",
      });
    }
  }, [user, form]);

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const userData = { ...data };
      if (clinicId) {
        userData.clinicId = clinicId;
      }
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      // Don't send password if it's empty
      const updateData = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      if (clinicId) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', clinicId] });
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${user?.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      if (clinicId) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', clinicId] });
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  async function onSubmit(data: any) {
    if (isEditing) {
      await updateUserMutation.mutateAsync(data);
    } else {
      await createUserMutation.mutateAsync(data);
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      await deleteUserMutation.mutateAsync();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit User: ${user?.username}` : "Add New User"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter username" 
                      {...field} 
                      disabled={!canEditUsername && isEditing}
                    />
                  </FormControl>
                  {!canEditUsername && isEditing && (
                    <p className="text-xs text-muted-foreground">
                      {isEditingSelf ? "You cannot change your own username" : "Only admins can change usernames"}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Password {isEditing && <span className="text-gray-500">(leave empty to keep current)</span>}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder={isEditing ? "Enter new password" : "Enter password"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Normal User</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between pt-4 space-x-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                </Button>
              )}
              
              <div className="flex space-x-2 ml-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) 
                    ? "Saving..." 
                    : isEditing 
                    ? "Update User" 
                    : "Create User"
                  }
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
