import { useState, useEffect } from "react";
import { Atom, Settings, HelpCircle, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { APP_META, updateDocumentTitle } from "@/config/appMeta";
import { HelpModal } from "./HelpModal";
import { SettingsSheet } from "./SettingsSheet";
import { AccountMenu } from "./AccountMenu";
import { LanguageSelectorButton } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
  onManageConnections?: () => void;
}

export default function AppHeader({ onMobileMenuToggle, onManageConnections }: AppHeaderProps) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Update document title on mount
  useEffect(() => {
    updateDocumentTitle();
  }, []);


  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input/textarea is focused
      if (document.activeElement?.tagName === "INPUT" || 
          document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleManageConnections = () => {
    if (onManageConnections) {
      onManageConnections();
    } else {
      // Fallback to modules page
      window.location.href = "/modules";
    }
  };

  return (
    <>
      <nav className="bg-card shadow-sm border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity" data-testid="link-home">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Atom className="w-4 h-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  {APP_META.productName}
                </h1>
              </Link>
              <span className="text-muted-foreground text-sm hidden sm:block">
                {APP_META.description}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Language selector */}
              <LanguageSelectorButton />
              
              {/* Modules/Connections - always visible for easy access */}
              <Link href="/modules">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-primary" 
                  aria-label={t('navigation.modules')}
                  data-testid="button-modules"
                >
                  <Network className="w-4 h-4" />
                </Button>
              </Link>
              
              {/* Help button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary" 
                onClick={() => setHelpOpen(true)}
                aria-label={t('navigation.help')}
                data-testid="button-help"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
              
              {/* Settings button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary" 
                onClick={() => setSettingsOpen(true)}
                aria-label={t('navigation.settings')}
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              
              {/* Account menu */}
              <AccountMenu onManageConnections={handleManageConnections} />
            </div>
          </div>
        </div>
      </nav>

      {/* Modals */}
      <HelpModal 
        open={helpOpen} 
        onClose={() => setHelpOpen(false)} 
      />
      
      <SettingsSheet 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </>
  );
}