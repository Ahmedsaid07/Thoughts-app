import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Edit, Trash2, Plus } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ThoughtHistoryWithUser, ThoughtWithAuthor } from "@shared/schema";

interface ThoughtHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thought: ThoughtWithAuthor | null;
}

export default function ThoughtHistoryModal({ 
  open, 
  onOpenChange, 
  thought 
}: ThoughtHistoryModalProps) {
  const { data: history = [], isLoading } = useQuery<ThoughtHistoryWithUser[]>({
    queryKey: ['/api/thoughts', thought?.id, 'history'],
    enabled: open && !!thought?.id,
  });

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "created":
        return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "edited":
        return <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "deleted":
        return <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getChangeLabel = (changeType: string) => {
    switch (changeType) {
      case "created":
        return "Created";
      case "edited":
        return "Edited";
      case "deleted":
        return "Deleted";
      default:
        return "Changed";
    }
  };

  const getChangeBadgeVariant = (changeType: string) => {
    switch (changeType) {
      case "created":
        return "default";
      case "edited":
        return "secondary";
      case "deleted":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (!thought) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Thought History
          </DialogTitle>
          <DialogDescription>
            View the complete edit history and changes for "{thought.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading history...</div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">No history found</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current state */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={thought.isDeleted ? "destructive" : "default"}>
                        {thought.isDeleted ? "Currently Deleted" : "Current Version"}
                      </Badge>
                      {(thought.editCount || 0) > 0 && (
                        <Badge variant="secondary">
                          {thought.editCount || 0} edit{(thought.editCount || 0) !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created {formatDate(thought.createdAt || new Date())}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">{thought.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {thought.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Category: {thought.category}</span>
                      {thought.department && <span>Department: {thought.department}</span>}
                    </div>
                    
                    {thought.isDeleted && thought.deletedByUser && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
                        <Trash2 className="h-3 w-3" />
                        <span>
                          Deleted by {thought.deletedByUser.username} on{' '}
                          {formatDate(thought.deletedAt || new Date())}
                        </span>
                      </div>
                    )}
                    
                    {thought.lastEditedByUser && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Edit className="h-3 w-3" />
                        <span>
                          Last edited by {thought.lastEditedByUser.username} on{' '}
                          {formatDate(thought.lastEditedAt || new Date())}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* History entries */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Change History</h4>
                  {history.map((entry, index) => (
                    <div key={`${entry.id}-${index}`} className="border-l-2 border-muted pl-4 pb-6 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center -ml-3 ${
                            entry.changeType === "current" ? "bg-green-500" :
                            entry.changeType === "deleted" ? "bg-red-500" : "bg-blue-500"
                          }`}>
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <span className="font-medium text-sm">
                              {entry.changeType === "current" && "Current Version"}
                              {entry.changeType === "created" && "Created"}
                              {entry.changeType === "edited" && "Edited"}
                              {entry.changeType === "deleted" && "Deleted"}
                            </span>
                            <span className="text-muted-foreground text-sm ml-2">
                              by {entry.editedByUser?.username || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(entry.editedAt || new Date())}
                        </div>
                      </div>
                      
                      {/* Show the actual content at this point in history */}
                      <div className="bg-muted/50 rounded p-3 space-y-2 mt-2">
                        {entry.title && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Title:</span>
                            <p className="text-sm">{entry.title}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Content:</span>
                          <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {entry.category && <span>Category: {entry.category}</span>}
                          {entry.department && <span>Department: {entry.department}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}