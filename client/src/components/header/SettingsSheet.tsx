import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type ThemeMode = "light" | "dark" | "system";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("theme") as ThemeMode) || "system";
  });
  const [defaultProvider, setDefaultProvider] = useState(() => {
    return localStorage.getItem("defaultProvider") || "deepseek";
  });
  const [defaultMode, setDefaultMode] = useState(() => {
    return localStorage.getItem("defaultMode") || "implement";
  });
  const [showConnections, setShowConnections] = useState(() => {
    return localStorage.getItem("showConnectionsInHeader") === "true";
  });

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Save other settings
  useEffect(() => {
    localStorage.setItem("defaultProvider", defaultProvider);
  }, [defaultProvider]);

  useEffect(() => {
    localStorage.setItem("defaultMode", defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    localStorage.setItem("showConnectionsInHeader", showConnections.toString());
  }, [showConnections]);

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

  const providers = [
    { id: "deepseek", name: "DeepSeek" },
    { id: "kimi", name: "Kimi" },
    { id: "openai", name: "OpenAI" },
    { id: "anthropic", name: "Anthropic" },
    { id: "perplexity", name: "Perplexity" },
    { id: "replit", name: "Replit" }
  ];

  const modes = [
    { id: "analyze", name: "Analyze" },
    { id: "implement", name: "Implement" },
    { id: "review", name: "Review" },
    { id: "test", name: "Test" }
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent aria-describedby="settings-description" className="flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </SheetTitle>
        </SheetHeader>

        <div id="settings-description" className="flex-1 overflow-y-auto space-y-6 mt-6 pr-2">
          {/* Theme Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Theme</Label>
            <RadioGroup
              value={theme}
              onValueChange={(value: ThemeMode) => setTheme(value)}
              className="space-y-2"
              aria-label="Select theme"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light" className="flex items-center gap-2 cursor-pointer">
                  <Sun className="w-4 h-4" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark" className="flex items-center gap-2 cursor-pointer">
                  <Moon className="w-4 h-4" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="theme-system" />
                <Label htmlFor="theme-system" className="flex items-center gap-2 cursor-pointer">
                  <Monitor className="w-4 h-4" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Default Provider */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Default Provider</Label>
            <RadioGroup
              value={defaultProvider}
              onValueChange={setDefaultProvider}
              className="space-y-2"
              aria-label="Select default provider"
            >
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={provider.id} id={`provider-${provider.id}`} />
                  <Label htmlFor={`provider-${provider.id}`} className="cursor-pointer">
                    {provider.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Default Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Default Mode</Label>
            <RadioGroup
              value={defaultMode}
              onValueChange={setDefaultMode}
              className="space-y-2"
              aria-label="Select default mode"
            >
              {modes.map((mode) => (
                <div key={mode.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={mode.id} id={`mode-${mode.id}`} />
                  <Label htmlFor={`mode-${mode.id}`} className="cursor-pointer">
                    {mode.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* UI Preferences */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Interface</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-connections" className="text-sm">
                Show connections panel in header
              </Label>
              <Switch
                id="show-connections"
                checked={showConnections}
                onCheckedChange={setShowConnections}
                aria-label="Toggle connections panel visibility"
                data-testid="switch-show-connections"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}