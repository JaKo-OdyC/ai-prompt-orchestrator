import { Loader2 } from "lucide-react";
import type { PromptPreview } from "@shared/schema";

interface CodePreviewProps {
  preview: PromptPreview | null;
  isLoading: boolean;
}

export function CodePreview({ preview, isLoading }: CodePreviewProps) {
  if (isLoading) {
    return (
      <div className="code-preview rounded-lg p-8 max-h-96 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating preview...</span>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="code-preview rounded-lg p-8 max-h-96 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Upload files and configure settings to see preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="code-preview rounded-lg p-4 max-h-96 overflow-y-auto">
      <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">
        <code>{preview.content}</code>
      </pre>
    </div>
  );
}
