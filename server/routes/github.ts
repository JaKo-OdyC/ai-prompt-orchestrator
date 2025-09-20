import type { Express, Request, Response } from "express";
import { getUncachableGitHubClient, createRepository, pushToRepository } from "../lib/github";
import { glob } from "glob";
import { readFileSync } from "fs";
import { join } from "path";

export function mountGitHubRoutes(app: Express) {
  // Create repository and push current project
  app.post("/api/github/push", async (req: Request, res: Response) => {
    try {
      const { repoName, description, isPrivate = false } = req.body;
      
      if (!repoName) {
        return res.status(400).json({ error: "Repository name is required" });
      }

      const octokit = await getUncachableGitHubClient();
      const user = await octokit.rest.users.getAuthenticated();
      
      // Create repository
      const repo = await createRepository(repoName, description, isPrivate);
      
      // Get all project files (excluding node_modules, .git, etc.)
      const patterns = [
        "client/**/*",
        "server/**/*", 
        "shared/**/*",
        "packages/**/*",
        "*.ts",
        "*.js", 
        "*.json",
        "*.md",
        "*.css",
        "*.html"
      ];
      
      const excludePatterns = [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/tmp/**",
        "**/*.log",
        "**/attached_assets/**"
      ];
      
      const files: Array<{path: string, content: string}> = [];
      
      for (const pattern of patterns) {
        const matches = await glob(pattern, { 
          ignore: excludePatterns,
          cwd: process.cwd(),
          nodir: true 
        });
        
        for (const filePath of matches) {
          try {
            const fullPath = join(process.cwd(), filePath);
            const content = readFileSync(fullPath, 'utf-8');
            files.push({
              path: filePath,
              content
            });
          } catch (error) {
            console.warn(`Could not read file ${filePath}:`, error);
          }
        }
      }
      
      // Push to repository
      const commit = await pushToRepository(
        user.data.login,
        repoName,
        files,
        "Initial commit: AI Prompt Orchestrator with enterprise modules"
      );
      
      res.json({
        success: true,
        repository: repo,
        commit,
        filesUploaded: files.length
      });
      
    } catch (error: any) {
      console.error("GitHub push error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to push to GitHub",
        details: error.response?.data
      });
    }
  });
  
  // Get user's repositories
  app.get("/api/github/repos", async (req: Request, res: Response) => {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 50
      });
      
      res.json(repos);
    } catch (error: any) {
      console.error("GitHub repos error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}