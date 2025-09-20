import { useState } from "react";
import { User, Settings, Download, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface AccountMenuProps {
  onManageConnections: () => void;
}

export function AccountMenu({ onManageConnections }: AccountMenuProps) {
  const { toast } = useToast();

  const handleExportSettings = () => {
    try {
      const settings = {
        theme: localStorage.getItem("theme") || "system",
        defaultProvider: localStorage.getItem("defaultProvider") || "deepseek",
        defaultMode: localStorage.getItem("defaultMode") || "implement",
        showConnectionsInHeader: localStorage.getItem("showConnectionsInHeader") === "true",
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: "application/json"
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orchestrator-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Settings exported",
        description: "Your settings have been downloaded as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = () => {
    // Stub for future authentication implementation
    toast({
      title: "Sign out (Coming soon)",
      description: "Authentication system will be implemented in a future version.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full"
          aria-label="Open user menu"
          data-testid="button-account-menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem
          onClick={onManageConnections}
          data-testid="menu-manage-connections"
        >
          <Shield className="mr-2 h-4 w-4" />
          <span>Manage Connections…</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleExportSettings}
          data-testid="menu-export-settings"
        >
          <Download className="mr-2 h-4 w-4" />
          <span>Export Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleSignOut}
          data-testid="menu-sign-out"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}