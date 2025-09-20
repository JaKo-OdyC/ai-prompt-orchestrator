import { useEffect } from "react";
import { X, ExternalLink, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_META } from "@/config/appMeta";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="help-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {APP_META.productName} - Help
          </DialogTitle>
        </DialogHeader>
        
        <div id="help-description" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {APP_META.description}
          </p>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Close dialogs</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">Esc</kbd>
              </div>
              <div className="flex justify-between">
                <span>Open help</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">?</kbd>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Quick Guide</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Upload JavaScript/TypeScript files</li>
              <li>• Files are automatically chunked (≤120 lines)</li>
              <li>• Select AI providers and modes</li>
              <li>• Generate tailored prompts for each provider</li>
              <li>• Compare results across providers</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Version {APP_META.version}</span>
              <div className="flex gap-2">
                {APP_META.docsUrl !== "#" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => window.open(APP_META.docsUrl, "_blank")}
                    data-testid="button-help-docs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Docs
                  </Button>
                )}
                {APP_META.githubUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => window.open(APP_META.githubUrl, "_blank")}
                    data-testid="button-help-github"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    GitHub
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={onClose} 
            aria-label="Close help dialog"
            data-testid="button-help-close"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}