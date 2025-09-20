import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import multer from "multer";
import { storage } from "./storage";
import { insertPromptJobSchema, runInputSchema, type PromptRequest, type PromptPreview } from "@shared/schema";
import { OrchestratorService } from "./services/orchestrator";
import { run as robustkitRun } from "./services/robustkit";
import { moduleManager } from "./services/module-service";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 20
  }
});

// Dedicated multer instance for ZIP uploads using disk storage
const zipUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      cb(null, `upload_${Date.now()}_${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for ZIP files
  },
  fileFilter: (req, file, cb) => {
    const isZip = /zip/.test(file.mimetype) || file.originalname.toLowerCase().endsWith('.zip');
    cb(null, isZip);
  }
});

// Helper function to scan extracted files (for ZIP fallback method)
async function scanExtractedFiles(dirPath: string): Promise<any[]> {
  const allowedExtensions = new Set(['.js', '.ts', '.tsx', '.md', '.json', '.css', '.html', '.py', '.txt', '.java', '.go', '.rs', '.cpp', '.cc', '.c', '.hpp', '.h', '.yml', '.yaml', '.sh', '.scss', '.xml', '.toml', '.ini', '.gradle', '.cs', '.rb', '.php']);
  const files: any[] = [];

  async function scanDirectoryRecursive(currentDirPath: string, relativePath: string): Promise<void> {
    try {
      const entries = fs.readdirSync(currentDirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDirPath, entry.name);
        const currentRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await scanDirectoryRecursive(fullPath, currentRelativePath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();

          if (allowedExtensions.has(ext)) {
            try {
              const stats = fs.statSync(fullPath);

              if (stats.size > 10 * 1024 * 1024) { // 10MB limit
                console.warn(`Skipping large file: ${currentRelativePath} (${stats.size} bytes)`);
                continue;
              }

              files.push({
                path: currentRelativePath,
                fullPath,
                extension: ext,
                size: stats.size
              });

            } catch (error) {
              console.warn(`Error processing file ${currentRelativePath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentDirPath}:`, error);
    }
  }

  await scanDirectoryRecursive(dirPath, '');
  return files;
}

// Bulletproof ZIP processor functions for pure JavaScript extraction
function parseZipStructure(zipBuffer: Buffer): any[] {
  const files: any[] = [];
  const allowedExtensions = new Set(['.js', '.ts', '.tsx', '.md', '.json', '.css', '.html', '.py', '.txt', '.jsx', '.java', '.go', '.rs', '.cpp', '.cc', '.c', '.hpp', '.h', '.yml', '.yaml', '.sh', '.scss', '.xml', '.toml', '.ini', '.gradle', '.cs', '.rb', '.php']);

  try {
    // Find End of Central Directory Record (EOCD) - scan from end
    let eocdOffset = -1;
    for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
      if (zipBuffer[i] === 0x50 && zipBuffer[i + 1] === 0x4B && 
          zipBuffer[i + 2] === 0x05 && zipBuffer[i + 3] === 0x06) {
        eocdOffset = i;
        break;
      }
    }
    
    if (eocdOffset === -1) {
      throw new Error('Could not find End of Central Directory Record');
    }
    
    // Read EOCD data
    const centralDirEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
    const centralDirSize = zipBuffer.readUInt32LE(eocdOffset + 12);
    const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
    
    console.log(`📁 EOCD found: ${centralDirEntries} entries, central dir at offset ${centralDirOffset}`);
    
    // Parse central directory entries
    let currentOffset = centralDirOffset;
    for (let i = 0; i < centralDirEntries; i++) {
      if (currentOffset + 46 > zipBuffer.length) break;
      
      // Check central directory file header signature
      if (zipBuffer[currentOffset] === 0x50 && zipBuffer[currentOffset + 1] === 0x4B && 
          zipBuffer[currentOffset + 2] === 0x01 && zipBuffer[currentOffset + 3] === 0x02) {
        
        const entry = parseCentralDirEntry(zipBuffer, currentOffset);
        if (entry && isValidFileEntry(entry, allowedExtensions)) {
          files.push(entry);
        }
        
        // Move to next entry
        const filenameLength = zipBuffer.readUInt16LE(currentOffset + 28);
        const extraFieldLength = zipBuffer.readUInt16LE(currentOffset + 30);
        const commentLength = zipBuffer.readUInt16LE(currentOffset + 32);
        currentOffset += 46 + filenameLength + extraFieldLength + commentLength;
      } else {
        break; // Invalid signature, stop parsing
      }
    }
    
    console.log(`📁 Found ${files.length} valid files in ZIP structure`);
    return files;
    
  } catch (error) {
    console.error(`❌ ZIP parsing failed:`, error);
    return [];
  }
}

function parseCentralDirEntry(buffer: Buffer, offset: number): any | null {
  try {
    const filenameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);

    const filename = buffer.subarray(offset + 46, offset + 46 + filenameLength).toString('utf8');
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    
    return {
      filename,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      compressionMethod,
      isDirectory: filename.endsWith('/')
    };
    
  } catch (error) {
    return null;
  }
}

function isValidFileEntry(entry: any, allowedExtensions: Set<string>): boolean {
  if (entry.isDirectory) return false;
  if (entry.filename.includes('../')) return false; // Path traversal protection

  const ext = path.extname(entry.filename).toLowerCase();
  return allowedExtensions.has(ext);
}

async function extractSingleFileFromZip(fileEntry: any, zipBuffer: Buffer, outputDir: string, usedFilenames: Set<string>): Promise<any | null> {
  try {
    // Find local file header
    const localHeaderOffset = fileEntry.localHeaderOffset;

    // Verify local header signature
    if (zipBuffer[localHeaderOffset] !== 0x50 || zipBuffer[localHeaderOffset + 1] !== 0x4B ||
        zipBuffer[localHeaderOffset + 2] !== 0x03 || zipBuffer[localHeaderOffset + 3] !== 0x04) {
      throw new Error('Invalid local header signature');
    }
    
    // Read local header data
    const filenameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const extraFieldLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const compressionMethod = zipBuffer.readUInt16LE(localHeaderOffset + 8);
    
    // Calculate data offset
    const dataOffset = localHeaderOffset + 30 + filenameLength + extraFieldLength;
    
    // Size limit check
    if (fileEntry.uncompressedSize > 10 * 1024 * 1024) { // 10MB limit
      console.warn(`⚠️ Skipping large file: ${fileEntry.filename} (${fileEntry.uncompressedSize} bytes)`);
      return null;
    }
    
    // Extract file data
    let fileData: Buffer;
    if (compressionMethod === 0) {
      // No compression - extract directly
      fileData = zipBuffer.subarray(dataOffset, dataOffset + fileEntry.uncompressedSize);
    } else if (compressionMethod === 8) {
      // DEFLATE compression - use Node.js zlib
      const { inflateRawSync } = await import('zlib');
      const compressedData = zipBuffer.subarray(dataOffset, dataOffset + fileEntry.compressedSize);
      
      try {
        fileData = inflateRawSync(compressedData);
        
        // Verify decompressed size
        if (fileData.length !== fileEntry.uncompressedSize) {
          throw new Error(`Size mismatch: expected ${fileEntry.uncompressedSize}, got ${fileData.length}`);
        }
      } catch (inflateError) {
        console.warn(`⚠️ Failed to decompress ${fileEntry.filename}:`, inflateError);
        return null;
      }
    } else {
      console.warn(`⚠️ Unsupported compression method ${compressionMethod} for: ${fileEntry.filename}`);
      return null;
    }
    
    // Generate unique filename to avoid conflicts
    let baseFilename = path.basename(fileEntry.filename);
    let finalFilename = baseFilename;
    let counter = 1;
    
    while (usedFilenames.has(finalFilename)) {
      const ext = path.extname(baseFilename);
      const nameWithoutExt = path.basename(baseFilename, ext);
      finalFilename = `${nameWithoutExt}-${counter}${ext}`;
      counter++;
    }
    
    usedFilenames.add(finalFilename);
    
    // Write extracted file
    const outputPath = path.join(outputDir, finalFilename);
    fs.writeFileSync(outputPath, fileData);
    
    console.log(`✅ Extracted: ${fileEntry.filename} → ${finalFilename}`);
    
    return {
      originalPath: fileEntry.filename,
      extractedPath: outputPath,
      size: fileEntry.uncompressedSize,
      extension: path.extname(fileEntry.filename).toLowerCase()
    };
    
  } catch (error) {
    console.error(`❌ Failed to extract ${fileEntry.filename}:`, error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const orchestrator = new OrchestratorService();

  // File upload and prompt generation
  app.post("/api/prompts/generate", upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { title, feature, acceptance, useCaseId, providers, modes, maxLines, directPrompt, useDirectPrompt } = req.body;
      
      // Check if we have either files or direct prompt
      const hasFiles = files && files.length > 0;
      const hasDirectPrompt = useDirectPrompt === 'true' && directPrompt && directPrompt.trim().length > 0;
      
      if (!hasFiles && !hasDirectPrompt) {
        return res.status(400).json({ error: "Either files or direct prompt is required" });
      }

      // Validate providers and modes are arrays
      const providersArray = Array.isArray(providers) ? providers : JSON.parse(providers || '[]');
      const modesArray = Array.isArray(modes) ? modes : JSON.parse(modes || '[]');

      if (providersArray.length === 0) {
        return res.status(400).json({ error: "At least one provider must be selected" });
      }

      if (modesArray.length === 0) {
        return res.status(400).json({ error: "At least one mode must be selected" });
      }

      // Process files or direct prompt
      let processedFiles: Array<{name: string, size: number, content: string}> = [];
      if (hasFiles) {
        processedFiles = files.map(file => ({
          name: file.originalname,
          size: file.size,
          content: file.buffer.toString('utf-8')
        }));
      } else if (hasDirectPrompt) {
        // For direct prompts, create a virtual file
        processedFiles = [{
          name: 'direct_prompt.md',
          size: directPrompt.length,
          content: directPrompt
        }];
      }

      const promptRequest: PromptRequest = {
        title: title || 'Untitled Task',
        feature: feature || '',
        acceptance: acceptance || '',
        useCaseId: useCaseId || 'uc_demo_edu_tutor',
        providers: providersArray,
        modes: modesArray,
        maxLines: parseInt(maxLines) || 120,
        files: processedFiles
      };

      // Validate the request
      const validatedRequest = insertPromptJobSchema.parse({
        ...promptRequest,
        status: 'processing'
      });

      // Create job record
      const job = await storage.createPromptJob(validatedRequest);

      // Generate prompts
      const generatedPrompts = await orchestrator.generatePrompts(promptRequest);

      // Save generated prompts
      for (const prompt of generatedPrompts) {
        await storage.createGeneratedPrompt({
          jobId: job.id,
          provider: prompt.provider,
          mode: prompt.mode,
          content: prompt.content,
          filename: `${Date.now()}_${prompt.provider}_${prompt.mode}.md`
        });
      }

      // Update job status
      await storage.updatePromptJobStatus(job.id, 'completed');

      res.json({
        jobId: job.id,
        prompts: generatedPrompts
      });
    } catch (error) {
      console.error('Prompt generation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  // Preview prompt for specific provider/mode combination
  app.post("/api/prompts/preview", upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { title, feature, acceptance, useCaseId, provider, mode, maxLines, directPrompt, useDirectPrompt } = req.body;
      
      // Check if we have either files or direct prompt
      const hasFiles = files && files.length > 0;
      const hasDirectPrompt = useDirectPrompt === 'true' && directPrompt && directPrompt.trim().length > 0;
      
      if (!hasFiles && !hasDirectPrompt) {
        return res.status(400).json({ error: "Either files or direct prompt is required" });
      }

      if (!provider || !mode) {
        return res.status(400).json({ error: "Provider and mode are required" });
      }

      // Process files or direct prompt
      let processedFiles: Array<{name: string, size: number, content: string}> = [];
      if (hasFiles) {
        processedFiles = files.map(file => ({
          name: file.originalname,
          size: file.size,
          content: file.buffer.toString('utf-8')
        }));
      } else if (hasDirectPrompt) {
        // For direct prompts, create a virtual file
        processedFiles = [{
          name: 'direct_prompt.md',
          size: directPrompt.length,
          content: directPrompt
        }];
      }

      const promptRequest: PromptRequest = {
        title: title || 'Untitled Task',
        feature: feature || '',
        acceptance: acceptance || '',
        useCaseId: useCaseId || 'uc_demo_edu_tutor',
        providers: [provider],
        modes: [mode],
        maxLines: parseInt(maxLines) || 120,
        files: processedFiles
      };

      const preview = await orchestrator.generatePreview(promptRequest, provider, mode);

      res.json(preview);
    } catch (error) {
      console.error('Prompt preview error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  // Download generated prompts
  app.get("/api/prompts/:jobId/download", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getPromptJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const prompts = await storage.getGeneratedPromptsByJob(jobId);
      
      if (prompts.length === 0) {
        return res.status(404).json({ error: "No prompts found for this job" });
      }

      // For single prompt, return as text
      if (prompts.length === 1) {
        const prompt = prompts[0];
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${prompt.filename}"`);
        return res.send(prompt.content);
      }

      // For multiple prompts, create a simple archive format
      let archive = '';
      for (const prompt of prompts) {
        archive += `# ${prompt.filename}\n\n${prompt.content}\n\n---\n\n`;
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="prompts_${jobId}.txt"`);
      res.send(archive);

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  // Get job status
  app.get("/api/prompts/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getPromptJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const prompts = await storage.getGeneratedPromptsByJob(jobId);

      res.json({
        job,
        prompts: prompts.map(p => ({
          provider: p.provider,
          mode: p.mode,
          filename: p.filename,
          createdAt: p.createdAt
        }))
      });
    } catch (error) {
      console.error('Job status error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  // ZIP processing endpoint
  app.post("/api/zip/extract", zipUpload.single('file'), async (req, res) => {
    try {
      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ error: "No ZIP file uploaded" });
      }

      // Check if file is a ZIP file
      if (!file.originalname.toLowerCase().endsWith('.zip')) {
        return res.status(400).json({ error: "File must be a ZIP archive" });
      }

      // Get module configuration for ZIP extractor
      const zipModule = await moduleManager.get("zip-extractor");
      if (!zipModule || zipModule.status !== "connected") {
        return res.status(503).json({ error: "ZIP extractor module not available" });
      }

      // Use the file path directly from disk storage
      const zipPath = (file as any).path;
      
      // Integrity check: compare uploaded size vs file on disk
      const diskStats = fs.statSync(zipPath);
      if (file.size !== diskStats.size) {
        console.error(`File size mismatch: uploaded ${file.size} bytes, disk ${diskStats.size} bytes`);
        return res.status(400).json({ 
          error: `File integrity check failed: uploaded ${file.size} bytes, saved ${diskStats.size} bytes` 
        });
      }

      // Enhanced ZIP validation using techniques from ZIP debugger
      console.log(`🔍 Starting ZIP validation for: ${file.originalname} (${diskStats.size} bytes)`);
      
      // Check minimum ZIP file size
      if (diskStats.size < 22) {
        console.error(`File too small to be a valid ZIP (minimum 22 bytes, got ${diskStats.size})`);
        return res.status(400).json({ 
          error: `File too small to be a valid ZIP archive (minimum 22 bytes required)` 
        });
      }

      // ZIP header validation - check for "PK" signature
      try {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(zipPath, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        
        const signature = buffer.toString('hex').toUpperCase();
        const isValidZip = signature.startsWith('504B'); // "PK" in hex
        
        console.log(`ZIP header check: ${isValidZip ? 'VALID' : 'INVALID'} (signature: ${signature})`);
        
        if (!isValidZip) {
          console.error(`Invalid ZIP file header. Expected: 504B..., Found: ${signature}`);
          return res.status(400).json({ 
            error: `Invalid ZIP file format - corrupted or not a ZIP archive` 
          });
        }
      } catch (headerError) {
        console.error(`ZIP header validation failed:`, headerError);
        return res.status(400).json({ 
          error: `Unable to validate ZIP file format` 
        });
      }

      // Create temporary directories for processing
      const tempDir = path.join(os.tmpdir(), `zip_extract_${Date.now()}`);
      const outputDir = path.join(tempDir, 'output');

      // Ensure directories exist
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(outputDir, { recursive: true });

      // Get config from module
      const config = zipModule.config || {};
      const maxFiles = config.maxFiles || 500;
      const maxLines = config.maxLines || 2000;
      const includeExtensions = config.includeExtensions || ".js,.ts,.tsx,.py,.java,.go,.rs,.cpp,.cc,.c,.hpp,.h,.md,.json,.yml,.yaml,.sh,.css,.scss,.html,.xml,.toml,.ini,.gradle,.cs,.rb,.php";
      const excludeDirectories = config.excludeDirectories || "node_modules,.git,build,dist,out,.next,.cache,.venv,__pycache__";

      // Multi-method ZIP extraction with fallbacks
      console.log(`🚀 Starting ZIP extraction with fallback methods`);
      
      const scriptPath: string = path.join(process.cwd(), 'attached_assets/tools/zip_to_flatbundle/scripts/zip_to_flatbundle.js');
      const extractionMethods = [
        {
          name: 'bulletproof pure JavaScript extraction',
          execute: async () => {
            console.log(`🚀 Trying primary: bulletproof pure JavaScript extraction`);
            
            try {
              // Read ZIP file into buffer
              const zipBuffer = fs.readFileSync(zipPath);
              console.log(`📋 Read ZIP buffer: ${zipBuffer.length} bytes`);
              
              // Parse ZIP structure manually
              const zipFiles = parseZipStructure(zipBuffer);
              
              if (zipFiles.length === 0) {
                throw new Error('No extractable files found in ZIP structure');
              }
              
              console.log(`📁 Found ${zipFiles.length} extractable files`);
              
              // Extract files using pure JavaScript
              const extractedFiles = [];
              const usedFilenames = new Set<string>();
              
              for (const fileEntry of zipFiles) {
                const extracted = await extractSingleFileFromZip(fileEntry, zipBuffer, outputDir, usedFilenames);
                if (extracted) {
                  extractedFiles.push(extracted);
                }
              }
              
              if (extractedFiles.length === 0) {
                throw new Error('No files could be extracted from ZIP');
              }
              
              console.log(`✅ Pure JS extraction successful: ${extractedFiles.length} files extracted`);
              
              // Create a bundle from extracted files
              let bundleContent = `# Extracted from ${file.originalname} (Pure JS Method)\n\n`;
              
              for (const extractedFile of extractedFiles) {
                try {
                  const content = fs.readFileSync(extractedFile.extractedPath, 'utf-8');
                  bundleContent += `## ${extractedFile.originalPath}\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
                } catch (readError) {
                  console.warn(`Could not read file ${extractedFile.originalPath}:`, readError);
                }
              }
              
              // Write the bundle
              fs.writeFileSync(path.join(outputDir, 'bundle.txt'), bundleContent, 'utf-8');
              
              // Create index
              const indexData = {
                count: extractedFiles.length,
                totalSize: extractedFiles.reduce((sum, f) => sum + f.size, 0),
                files: extractedFiles.map(f => ({ 
                  path: path.basename(f.extractedPath), 
                  size: f.size,
                  originalPath: f.originalPath 
                }))
              };
              fs.writeFileSync(path.join(outputDir, 'INDEX.json'), JSON.stringify(indexData, null, 2), 'utf-8');
              
            } catch (error: any) {
              console.error(`Pure JS extraction failed:`, error.message);
              throw error;
            }
          }
        },
        {
          name: 'zip_to_flatbundle script',
          execute: async () => {
            console.log(`📋 Trying fallback: zip_to_flatbundle script`);
            
            const args: string[] = [
              scriptPath,
              '--zip', zipPath,
              '--out', outputDir,
              '--name', 'bundle.txt',
              '--include', includeExtensions,
              '--exclude-dirs', excludeDirectories,
              '--max-lines', maxLines.toString(),
              '--fenced', '1',
              '--toc', '1'
            ];

            const childProcess = spawn('node', args);
            
            let stdout = '';
            let stderr = '';
            
            childProcess.stdout?.on('data', (data) => {
              stdout += data.toString();
            });
            
            childProcess.stderr?.on('data', (data) => {
              stderr += data.toString();
            });
            
            await new Promise<void>((resolve, reject) => {
              childProcess.on('close', (code: number | null) => {
                if (code === 0) {
                  resolve();
                } else {
                  console.error(`Script extraction failed with code ${code}`);
                  console.error('stdout:', stdout);
                  console.error('stderr:', stderr);
                  reject(new Error(`Extraction failed with code ${code}. stderr: ${stderr}`));
                }
              });
              
              childProcess.on('error', (error: Error) => {
                console.error('Child process error:', error);
                reject(error);
              });
            });
          }
        },
        {
          name: 'container-safe manual extraction guide',
          execute: async () => {
            console.log(`📋 Creating manual extraction guide for container environments`);
            
            try {
              // Create extraction guide instead of using system tools
              const zipName = path.basename(zipPath);
              const guidePath = path.join(outputDir, 'EXTRACTION_GUIDE.md');
              
              const guide = `# Manual ZIP Extraction Guide

## Container-Safe Extraction Required

Your ZIP file has been validated but requires manual extraction in this container environment.

### File Information:
- **File**: ${zipName}
- **Location**: \`${zipPath}\`
- **Size**: ${fs.statSync(zipPath).size} bytes

### Container-Safe Options:

#### Option 1: File Manager (Recommended)
1. Navigate to your file manager in Replit
2. Locate the ZIP file
3. Right-click and select "Extract" or "Unzip"
4. Extract to a new folder

#### Option 2: Alternative Upload
1. Extract the ZIP on your local machine
2. Upload the extracted files directly to your Replit project
3. Use the file upload feature to add individual files

#### Option 3: Online Extraction Tool
1. Download the ZIP file from your project
2. Use an online extraction service like extract.me
3. Download the extracted files
4. Upload them back to your project

### After Extraction:
Run the analysis again with the extracted files for processing.

---
*This guide was generated because the container environment doesn't support external ZIP tools.*
`;
              
              fs.writeFileSync(guidePath, guide, 'utf-8');
              
              // Create a minimal bundle indicating manual extraction needed
              const bundleContent = `# Manual Extraction Required

The ZIP file "${file.originalname}" has been validated but requires manual extraction in this container environment.

Please follow the extraction guide at: \`${guidePath}\`

Once extracted, you can re-upload the individual files for analysis.
`;
              
              fs.writeFileSync(path.join(outputDir, 'bundle.txt'), bundleContent, 'utf-8');
              
              // Create index
              const indexData = {
                count: 0,
                totalSize: 0,
                files: [],
                requiresManualExtraction: true,
                guidePath
              };
              fs.writeFileSync(path.join(outputDir, 'INDEX.json'), JSON.stringify(indexData, null, 2), 'utf-8');
              
              console.log(`📋 Manual extraction guide created: ${guidePath}`);
              
            } catch (error) {
              throw new Error(`Manual extraction guide creation failed: ${error}`);
            }
          }
        }
      ];

      let extractionSuccessful = false;
      let lastError: Error | null = null;
      
      for (const method of extractionMethods) {
        try {
          console.log(`🔧 Attempting extraction method: ${method.name}`);
          await method.execute();
          console.log(`✅ ${method.name} succeeded!`);
          extractionSuccessful = true;
          break;
        } catch (error) {
          console.warn(`❌ ${method.name} failed:`, error);
          lastError = error as Error;
        }
      }
      
      if (!extractionSuccessful) {
        console.error(`❌ All extraction methods failed. Last error:`, lastError);
        throw new Error(`All extraction methods failed: ${lastError?.message || 'Unknown error'}`);
      }

      // Read the generated bundle and index
      const bundlePath = path.join(outputDir, 'bundle.txt');
      const indexPath = path.join(outputDir, 'INDEX.json');

      let bundleContent = '';
      let indexData = null;

      if (fs.existsSync(bundlePath)) {
        bundleContent = fs.readFileSync(bundlePath, 'utf-8');
      }

      if (fs.existsSync(indexPath)) {
        indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      }

      // Clean up temporary files and uploaded file
      fs.rmSync(tempDir, { recursive: true, force: true });
      // Remove the uploaded file from disk storage
      fs.unlinkSync(zipPath);

      res.json({
        success: true,
        originalFilename: file.originalname,
        extractedFiles: indexData?.count || 0,
        content: bundleContent,
        metadata: indexData,
        processedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('ZIP extraction error:', error);
      
      // Clean up uploaded file on error if it exists
      if (req.file && (req.file as any).path) {
        try {
          fs.unlinkSync((req.file as any).path);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to extract ZIP file' 
      });
    }
  });

  // Module management routes
  app.use("/api/modules", (await import("./routes/modules")).default);

  // GitHub integration routes
  try {
    const { mountGitHubRoutes } = await import("./routes/github");
    mountGitHubRoutes(app);
  } catch (error) {
    console.warn("GitHub routes not available:", error);
  }

  // RobustKit AI provider endpoint with normalized responses
  app.post("/api/robustkit/run", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedInput = runInputSchema.parse(req.body);
      
      // Execute robustkit run with normalized response
      const result = await robustkitRun(validatedInput);
      
      res.json(result);
    } catch (error) {
      console.error('RobustKit run error:', error);
      
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid request format',
          details: error.message 
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
