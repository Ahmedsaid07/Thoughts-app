import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export default function FileUpload({ 
  onFileSelect, 
  accept = "*/*", 
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  className = ""
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize) {
      alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    onFileSelect(file);
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={disabled}
        className="w-full flex items-center space-x-2"
      >
        <Upload className="w-4 h-4" />
        <span>Choose File</span>
      </Button>
    </div>
  );
}
