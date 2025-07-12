import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  className?: string;
  progress: number | null;
}

export function FileUpload({
  onFileSelect,
  className,
  progress,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        onFileSelect(selectedFile);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "audio/*": [".mp3", ".wav", ".m4a", ".flac", ".ogg"],
      },
      multiple: false,
      disabled: progress !== null,
    });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    onFileSelect(null);
  };

  if (file && progress !== null) {
    return (
      <div
        className={cn(
          "p-4 rounded-[var(--radius-container)] border border-dashed flex items-center justify-between",
          className
        )}
      >
        <div className="flex items-center gap-3 w-full">
          <FileIcon className="h-8 w-8 text-primary" />
          <div className="flex-grow">
            <p className="font-medium truncate">{file.name}</p>
            <div className="w-full bg-muted rounded-full h-2 mt-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <span className="text-sm font-semibold text-muted-foreground w-12 text-right">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    );
  }

  if (file) {
    return (
      <div
        className={cn(
          "p-4 rounded-[var(--radius-container)] border border-dashed flex items-center justify-between",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <FileIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={removeFile}
          aria-label="Remove file"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "p-10 border-2 border-dashed rounded-[var(--radius-container)] text-center cursor-pointer transition-colors",
        "hover:border-primary/50 hover:bg-accent",
        isDragActive && "border-primary bg-primary/10",
        isDragReject && "border-destructive bg-destructive/10",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <UploadCloud className="h-10 w-10" />
        <p className="font-semibold">
          {isDragActive
            ? "Drop the file here..."
            : "Drag & drop audio file here, or click to select"}
        </p>
        <p className="text-xs">Supported formats: MP3, WAV, M4A, FLAC</p>
      </div>
    </div>
  );
}
