import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, Github, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function GitHubPush() {
  const [repoName, setRepoName] = useState("ai-prompt-orchestrator");
  const [description, setDescription] = useState("Enterprise AI prompt orchestration platform with modular architecture");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handlePush = async () => {
    if (!repoName.trim()) {
      toast({
        title: "Repository name required",
        description: "Please enter a repository name",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoName: repoName.trim(),
          description: description.trim(),
          isPrivate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to push to GitHub");
      }

      const result = await response.json();

      setResult(result);
      toast({
        title: "Successfully pushed to GitHub!",
        description: `Repository '${repoName}' created with ${result.filesUploaded} files`,
      });
    } catch (error: any) {
      console.error("GitHub push error:", error);
      toast({
        title: "GitHub push failed",
        description: error.message || "Failed to push project to GitHub",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Push to GitHub
        </CardTitle>
        <CardDescription>
          Create a new GitHub repository and push your AI Prompt Orchestrator project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="repo-name">Repository Name</Label>
          <Input
            id="repo-name"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="ai-prompt-orchestrator"
            data-testid="input-repo-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enterprise AI prompt orchestration platform..."
            rows={3}
            data-testid="textarea-description"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="private"
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            data-testid="switch-private"
          />
          <Label htmlFor="private">Private repository</Label>
        </div>

        <Button 
          onClick={handlePush} 
          disabled={isLoading || !repoName.trim()}
          className="w-full"
          data-testid="button-push"
        >
          {isLoading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-spin" />
              Pushing to GitHub...
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Push to GitHub
            </>
          )}
        </Button>

        {result && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-green-700">Successfully pushed to GitHub!</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Repository:</strong> {result.repository.full_name}</p>
                    <p><strong>Files uploaded:</strong> {result.filesUploaded}</p>
                    <p><strong>URL:</strong> <a 
                      href={result.repository.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {result.repository.html_url}
                    </a></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}