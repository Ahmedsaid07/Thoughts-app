import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import FileUpload from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertClinicSchema, type Clinic } from "@shared/schema";
import { Hospital } from "lucide-react";

interface EditClinicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinic?: Clinic | null;
  onSuccess?: () => void;
}

export default function EditClinicModal({ open, onOpenChange, clinic, onSuccess }: EditClinicModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!clinic;

  const form = useForm({
    resolver: zodResolver(insertClinicSchema),
    defaultValues: {
      name: clinic?.name || "",
      url: clinic?.url || "",
      logoUrl: clinic?.logoUrl || "",
    },
  });

  // Reset form when clinic changes
  useEffect(() => {
    if (clinic) {
      form.reset({
        name: clinic.name,
        url: clinic.url || "",
        logoUrl: clinic.logoUrl || "",
      });
    } else {
      form.reset({
        name: "",
        url: "",
        logoUrl: "",
      });
    }
  }, [clinic, form]);

  const createClinicMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/clinics", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create clinic",
        variant: "destructive",
      });
    }
  });

  const updateClinicMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/clinics/${clinic?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clinic information updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics'] });
      queryClient.invalidateQueries({ queryKey: [`/api/clinics/${clinic?.id}`] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update clinic",
        variant: "destructive",
      });
    }
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(`/api/clinics/${clinic?.id}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('logoUrl', data.logoUrl);
      toast({
        title: "Success",
        description: "Logo uploaded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    }
  });

  async function onSubmit(data: any) {
    if (isEditing) {
      await updateClinicMutation.mutateAsync(data);
    } else {
      await createClinicMutation.mutateAsync(data);
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!clinic?.id) return;
    setIsUploading(true);
    try {
      await uploadLogoMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Clinic Information" : "Create New Clinic"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter clinic name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic Website URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Logo</label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  {form.watch('logoUrl') ? (
                    <img 
                      src={form.watch('logoUrl')} 
                      alt="Clinic logo" 
                      className="w-full h-full object-cover rounded-lg" 
                    />
                  ) : (
                    <Hospital className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <FileUpload
                    onFileSelect={handleFileUpload}
                    accept="image/*"
                    maxSize={2 * 1024 * 1024} // 2MB
                    disabled={isUploading || uploadLogoMutation.isPending}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload PNG, JPG or SVG. Max file size 2MB.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateClinicMutation.isPending || createClinicMutation.isPending || isUploading}
              >
                {(updateClinicMutation.isPending || createClinicMutation.isPending) 
                  ? "Saving..." 
                  : isEditing 
                  ? "Save Changes" 
                  : "Create Clinic"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
