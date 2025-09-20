import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import Navigation from "@/components/Navigation";

interface ModuleRecord {
  id: string;
  name: string;
  kind: "service" | "connector";
  description?: string;
  status: "connected" | "disconnected" | "error" | "unknown";
  lastSync?: string;
  capabilities?: Array<{ id: string; label: string }>;
  config?: Record<string, any>;
}

export function ModulesPage() {
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/modules');
      if (!response.ok) {
        throw new Error(`Failed to fetch modules: ${response.statusText}`);
      }
      const data = await response.json();
      setModules(data.modules || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleConnect = async (moduleId: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}/connect`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to connect module: ${response.statusText}`);
      }
      await fetchModules(); // Refresh the list
    } catch (err) {
      console.error('Failed to connect module:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect module');
    }
  };

  const handleDisconnect = async (moduleId: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}/disconnect`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to disconnect module: ${response.statusText}`);
      }
      await fetchModules(); // Refresh the list
    } catch (err) {
      console.error('Failed to disconnect module:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect module');
    }
  };

  const getStatusIcon = (status: ModuleRecord["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "disconnected":
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: ModuleRecord["status"]) => {
    const variants = {
      connected: "default",
      disconnected: "secondary",
      error: "destructive",
      unknown: "outline",
    } as const;
    
    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Module Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading AI provider modules...</p>
            </div>
          <div className="grid gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-modules-title">
              Module Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage AI provider integrations and service connections
            </p>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 dark:text-red-200">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6">
            {modules.map((module) => (
            <Card key={module.id} className="border hover:shadow-lg transition-shadow" data-testid={`card-module-${module.id}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(module.status)}
                    <div>
                      <CardTitle className="text-xl font-semibold" data-testid={`text-module-name-${module.id}`}>
                        {module.name}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(module.status)}
                        <Badge variant="outline" className="text-xs">
                          {module.kind}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(module.id)}
                      disabled={module.status === "connected"}
                      data-testid={`button-connect-${module.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(module.id)}
                      disabled={module.status === "disconnected"}
                      data-testid={`button-disconnect-${module.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-configure-${module.id}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {module.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{module.description}</p>
                )}
                
                {module.capabilities && module.capabilities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.capabilities.map((capability) => (
                        <Badge key={capability.id} variant="secondary" className="text-xs">
                          {capability.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {module.lastSync && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 dark:text-gray-400" data-testid={`text-last-sync-${module.id}`}>
                      Last sync: {new Date(module.lastSync).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            ))}
          </div>

          {modules.length === 0 && !loading && (
            <Card className="text-center py-12">
              <CardContent>
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No modules available</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No AI provider modules have been configured yet.
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
    </>
  );
}