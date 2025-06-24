import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import UserLayout from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { baseInsertThoughtSchema, type ThoughtWithAuthor } from "@shared/schema";
import { Send, Heart, MessageCircle, Edit, Trash2, MoreVertical, PlusCircle } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingThought, setEditingThought] = useState<ThoughtWithAuthor | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  // Get thoughts
  const { data: thoughts = [], isLoading: thoughtsLoading } = useQuery<ThoughtWithAuthor[]>({
    queryKey: ['/api/thoughts'],
  });

  // Get departments from the user's clinic data
  const departments: string[] = user?.clinic?.departments || [];
  const availableDepartments = departments.length > 0 ? departments : ['General'];

  // Thought submission form (no title field)
  const thoughtFormSchema = baseInsertThoughtSchema.pick({ 
    content: true, 
    department: true, 
    category: true 
  });
  
  const form = useForm({
    resolver: zodResolver(thoughtFormSchema),
    defaultValues: {
      content: "",
      department: availableDepartments[0] || "General",
      category: "general",
    },
  });

  // Edit thought form (no title field)
  const editForm = useForm({
    resolver: zodResolver(thoughtFormSchema),
    defaultValues: {
      content: "",
      department: availableDepartments[0] || "General",
      category: "general",
    },
  });

  const submitThoughtMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/thoughts", {
        ...data,
        title: "", // No title for users
        category: "general", // Default category for users
      });
      return response.json();
    },
    onSuccess: () => {
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 5000);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts'] });
      toast({
        title: "Success",
        description: "Your thought has been submitted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit thought",
        variant: "destructive",
      });
    }
  });

  const editThoughtMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/thoughts/${id}`, {
        ...data,
        title: "", // No title for users
        category: "general", // Keep existing category
      });
      return response.json();
    },
    onSuccess: () => {
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 5000);
      setShowEditDialog(false);
      setEditingThought(null);
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts'] });
      toast({
        title: "Success",
        description: "Your thought has been updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update thought",
        variant: "destructive",
      });
    }
  });

  const deleteThoughtMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/thoughts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Thought deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete thought",
        variant: "destructive",
      });
    }
  });

  async function onSubmit(data: any) {
    await submitThoughtMutation.mutateAsync(data);
  }

  async function onEditSubmit(data: any) {
    if (!editingThought) return;
    await editThoughtMutation.mutateAsync({ id: editingThought.id, data });
  }

  const handleEditThought = (thought: ThoughtWithAuthor) => {
    setEditingThought(thought);
    editForm.reset({
      content: thought.content,
      department: thought.department ?? "General",
    });
    setShowEditDialog(true);
  };

  const handleDeleteThought = async (thought: ThoughtWithAuthor) => {
    if (confirm("Are you sure you want to delete this thought? This action cannot be undone.")) {
      await deleteThoughtMutation.mutateAsync(thought.id);
    }
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Thank You Message */}
        {showThankYou && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">Thank you for your feedback!</h3>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Your thought has been submitted and will be reviewed by our team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit New Thought */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PlusCircle className="w-5 h-5" />
              <span>Share Your Thoughts</span>
            </CardTitle>
            <CardDescription>
              Share your feedback, suggestions, or any thoughts about our clinic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Thought</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share your thoughts, feedback, or suggestions..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableDepartments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={submitThoughtMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {submitThoughtMutation.isPending ? "Submitting..." : "Submit Thought"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* My Thoughts */}
        <Card>
          <CardHeader>
            <CardTitle>My Thoughts</CardTitle>
            <CardDescription>View and manage your submitted thoughts</CardDescription>
          </CardHeader>
        </Card>

        {/* Thoughts List */}
        <div className="space-y-4">
          {thoughtsLoading ? (
            <div className="text-center py-4">Loading thoughts...</div>
          ) : thoughts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No thoughts yet</h3>
                <p className="text-gray-500">
                  Share your first thought using the form above.
                </p>
              </CardContent>
            </Card>
          ) : (
            thoughts.map((thought) => (
              <Card key={thought.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="secondary">{thought.category}</Badge>
                        <Badge variant="outline">{thought.department}</Badge>
                        {thought.isRead && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <span className="mr-1">✓</span>
                            Read by Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{thought.content}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created {thought.createdAt ? new Date(thought.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        {thought.lastEditedAt && (
                          <span>Edited {new Date(thought.lastEditedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditThought(thought)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteThought(thought)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Thought Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Thought</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Thought</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share your thoughts..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableDepartments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editThoughtMutation.isPending}>
                    {editThoughtMutation.isPending ? "Updating..." : "Update Thought"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </UserLayout>
  );
}