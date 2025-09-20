import { X, Upload, FileText, Archive } from "lucide-react";
import { Button } from "./button";
import type { UploadedFile } from "@shared/schema";

interface FileDropzoneProps {
  onDrop: (files: File[]) => void;
  getRootProps: () => any;
  getInputProps: () => any;
  isDragActive: boolean;
  files: (UploadedFile & { id: string, isZip?: boolean })[];
  onRemoveFile: (id: string) => void;
}

export function FileDropzone({ 
  getRootProps, 
  getInputProps, 
  isDragActive, 
  files, 
  onRemoveFile 
}: FileDropzoneProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary'
        }`}
        data-testid="dropzone"
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <p className="text-base font-medium">
              {isDragActive ? 'Drop files here' : 'Drop code files or ZIP archives here'}
            </p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <p className="text-xs text-muted-foreground">Supports .js, .md, .txt, .zip files up to 10MB each</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Uploaded Files:</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                data-testid={`file-item-${file.name}`}
              >
                <div className="flex items-center space-x-3">
                  {(file as any).isZip ? (
                    <Archive className="w-4 h-4 text-purple-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm font-mono">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <Button
                  onClick={() => onRemoveFile(file.id)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  data-testid={`button-remove-${file.name}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
