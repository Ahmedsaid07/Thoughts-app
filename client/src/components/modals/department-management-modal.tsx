import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, AlertCircle, Check, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DepartmentManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: number;
}

export default function DepartmentManagementModal({ 
  open, 
  onOpenChange, 
  clinicId 
}: DepartmentManagementModalProps) {
  const { toast } = useToast();
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const { data: departments = [], isLoading } = useQuery<string[]>({
    queryKey: ['/api/clinics', clinicId, 'departments'],
    enabled: open && !!clinicId,
    select: (data) => {
      // Ensure we always get an array of strings
      if (Array.isArray(data)) {
        return data.filter(item => typeof item === 'string');
      }
      return [];
    }
  });

  const addDepartmentMutation = useMutation({
    mutationFn: async (department: string) => {
      console.log("Adding department:", department);
      const response = await apiRequest("POST", `/api/clinics/${clinicId}/departments`, { department });
      return response;
    },
    onSuccess: (data) => {
      console.log("Add department success:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/clinics', clinicId, 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics', clinicId] });
      setNewDepartment("");
      toast({
        title: "Success",
        description: "Department added successfully",
      });
    },
    onError: (error: Error) => {
      console.log("Add department error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ oldDepartment, newDepartment }: { oldDepartment: string; newDepartment: string }) => {
      console.log("Updating department:", { oldDepartment, newDepartment });
      const response = await apiRequest("PUT", `/api/clinics/${clinicId}/departments`, { oldDepartment, newDepartment });
      return response;
    },
    onSuccess: (data) => {
      console.log("Update department success:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/clinics', clinicId, 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics', clinicId] });
      setEditingDepartment(null);
      setEditValue("");
      toast({
        title: "Success",
        description: "Department updated successfully",
      });
    },
    onError: (error: Error) => {
      console.log("Update department error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (department: string) => {
      console.log("Deleting department:", department);
      const response = await apiRequest("DELETE", `/api/clinics/${clinicId}/departments/${encodeURIComponent(department)}`);
      return response;
    },
    onSuccess: (data) => {
      console.log("Delete department success:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/clinics', clinicId, 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics', clinicId] });
      toast({
        title: "Success",
        description: "Department removed successfully",
      });
    },
    onError: (error: Error) => {
      console.log("Delete department error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleAddDepartment = () => {
    const trimmed = newDepartment.trim();
    if (!trimmed) return;
    addDepartmentMutation.mutate(trimmed);
    setNewDepartment("");
  };

  const handleStartEdit = (department: string) => {
    setEditingDepartment(department);
    setEditValue(department);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === editingDepartment) {
      setEditingDepartment(null);
      setEditValue("");
      return;
    }
    updateDepartmentMutation.mutate({
      oldDepartment: editingDepartment!,
      newDepartment: trimmed,
    });
  };

  const handleCancelEdit = () => {
    setEditingDepartment(null);
    setEditValue("");
  };

  const handleDeleteDepartment = (department: string) => {
    if (departments.length <= 1) {
      toast({
        variant: "destructive",
        title: "Cannot Delete",
        description: "Cannot delete the last department. At least one department must remain.",
      });
      return;
    }
    
    if (confirm(`Are you sure you want to delete the "${department}" department? This will reassign all thoughts to another department.`)) {
      deleteDepartmentMutation.mutate(department);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Departments</DialogTitle>
          <DialogDescription>
            Add, edit, or remove departments for your clinic. Users will select from these when submitting thoughts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new department */}
          <div className="space-y-2">
            <Label htmlFor="newDepartment">Add New Department</Label>
            <div className="flex gap-2">
              <Input
                id="newDepartment"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Enter department name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddDepartment();
                  }
                }}
                disabled={addDepartmentMutation.isPending}
              />
              <Button
                onClick={handleAddDepartment}
                disabled={!newDepartment.trim() || addDepartmentMutation.isPending}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Department list */}
          <div className="space-y-2">
            <Label>Current Departments</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No departments found</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {departments.map((department: string) => (
                  <div
                    key={department}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    {editingDepartment === department ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit();
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          disabled={updateDepartmentMutation.isPending}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={updateDepartmentMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge variant="secondary" className="flex-1 justify-start">
                          {typeof department === 'string' ? department : JSON.stringify(department)}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(department)}
                            disabled={updateDepartmentMutation.isPending || deleteDepartmentMutation.isPending}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDepartment(department)}
                            disabled={updateDepartmentMutation.isPending || deleteDepartmentMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}