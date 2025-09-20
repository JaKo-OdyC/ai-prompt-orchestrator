import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { type PromptRequest, type PromptPreview, type UploadedFile } from "@shared/schema";

export class OrchestratorService {
  private playbooksPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.playbooksPath = path.join(__dirname, '..', 'playbooks');
  }

  private loadTemplate(category: string, name: string): string {
    const filePath = path.join(this.playbooksPath, category, `${name}.md`);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to load template ${category}/${name}:`, error);
      return '';
    }
  }

  private loadDialect(provider: string): string {
    return this.loadTemplate('dialects', provider);
  }

  private loadFormat(mode: string): string {
    return this.loadTemplate('formats', mode);
  }

  private loadRole(mode: string): string {
    return this.loadTemplate('roles', mode);
  }

  private loadReplit(): string {
    return this.loadTemplate('guardrails', 'replit');
  }

  private splitChunks(text: string, maxLines: number = 120): string[] {
    const lines = text.split(/\r?\n/);
    const chunks: string[] = [];
    
    for (let i = 0; i < lines.length; i += maxLines) {
      chunks.push(lines.slice(i, i + maxLines).join('\n'));
    }
    
    return chunks;
  }

  private buildContextBlocks(files: UploadedFile[], maxLines: number): string {
    if (!files || files.length === 0) return 'N/A';

    const blocks: string[] = [];
    
    for (const file of files) {
      const chunks = this.splitChunks(file.content, maxLines);
      chunks.forEach((chunk, idx) => {
        blocks.push(`### ${file.name} (part ${idx + 1})\n\`\`\`js\n${chunk}\n\`\`\``);
      });
    }
    
    return blocks.join('\n\n');
  }

  private buildPrompt(request: PromptRequest, provider: string, mode: string): string {
    const dialect = this.loadDialect(provider);
    let format = this.loadFormat(mode);
    const role = this.loadRole(mode);
    const replit = this.loadReplit();

    // Handle test mode use case ID replacement
    if (mode === 'test' && request.useCaseId) {
      format = format.replace(/\{\{USE_CASE_ID\}\}/g, request.useCaseId);
    }

    const contextBlocks = (mode === 'review' || mode === 'test') ? 'N/A' : 
      this.buildContextBlocks(request.files, request.maxLines);
    
    const featureBlock = (mode === 'implement') ? request.feature || '(not specified)' : '(not applicable)';
    const acceptanceBlock = request.acceptance || '(state clear, measurable outcomes)';

    const prompt = dialect
      .replace('{{ROLE_BLOCK}}', role)
      .replace('{{REPLIT_GUARDS}}', replit)
      .replace('{{TASK_TITLE}}', request.title)
      .replace('{{FEATURE_BLOCK}}', featureBlock)
      .replace('{{ACCEPTANCE_BLOCK}}', acceptanceBlock)
      .replace('{{CONTEXT_BLOCKS}}', contextBlocks)
      .replace('{{OUTPUT_BLOCK}}', format);

    return prompt;
  }

  async generatePrompts(request: PromptRequest): Promise<PromptPreview[]> {
    const results: PromptPreview[] = [];

    for (const provider of request.providers) {
      for (const mode of request.modes) {
        const content = this.buildPrompt(request, provider, mode);
        results.push({
          provider,
          mode,
          content
        });
      }
    }

    return results;
  }

  async generatePreview(request: PromptRequest, provider: string, mode: string): Promise<PromptPreview> {
    const content = this.buildPrompt(request, provider, mode);
    
    return {
      provider,
      mode,
      content
    };
  }
}
