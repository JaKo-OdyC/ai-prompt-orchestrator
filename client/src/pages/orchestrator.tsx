import { useState, useCallback, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ModeSelector, Mode } from "@/components/ModeSelector";
import { ProviderSelector } from "@/components/ProviderSelector";
import { GitHubPush } from "@/components/GitHubPush";
import { PROVIDERS } from "@/lib/providers";
import { postForm, postJSON } from "@/lib/api";
import { 
  Code, 
  Download, 
  Settings, 
  Eye, 
  Loader2,
  CheckCircle,
  AlertCircle,
  TestTube,
  Play,
  Network
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Link } from "wouter";
import type { UploadedFile } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface UploadedFileWithId extends UploadedFile {
  id: string;
  isZip?: boolean;
  file?: File;
}

export default function Orchestrator() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // File management
  const [files, setFiles] = useState<UploadedFileWithId[]>([]);
  
  // Provider and mode selection - enhanced with multi-select
  const [previewProvider, setPreviewProvider] = useState<string>("deepseek"); // single for preview
  const [providers, setProviders] = useState<string[]>(["deepseek"]); // multi for generate
  const [previewMode, setPreviewMode] = useState<Mode>("implement"); // single for preview
  const [modes, setModes] = useState<Mode[]>(["implement"]); // multi for generate
  
  // Task configuration
  const [title, setTitle] = useState("robustkit: normalized result object");
  const [feature, setFeature] = useState("Return {provider,model,status,latency_ms,text?,tokens?} in dry/draft/live; draft latency_ms=0; live measures Date.now diff.");
  const [acceptance, setAcceptance] = useState("No new deps. CommonJS. Exports/signatures unchanged.");
  const [useCaseId, setUseCaseId] = useState("uc_demo_edu_tutor");
  const [maxLines, setMaxLines] = useState(120);
  const [processingMode, setProcessingMode] = useState<string>("automatic");
  
  // Direct prompt option
  const [directPrompt, setDirectPrompt] = useState("");
  const [useDirectPrompt, setUseDirectPrompt] = useState(false);
  
  // State management
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // RobustKit Test console
  const [rkPrompt, setRkPrompt] = useState("");
  const [rkProvider, setRkProvider] = useState("deepseek");
  const [rkModel, setRkModel] = useState("mini");
  const [rkMode, setRkMode] = useState<"dry" | "draft" | "live">("dry");
  const [rkTemp, setRkTemp] = useState(0.2);
  const [rkBusy, setRkBusy] = useState(false);
  const [rkResult, setRkResult] = useState<any>(null);

  // File upload handling
  const maxFiles = 20;
  const maxPerFileBytes = 10 * 1024 * 1024; // 10MB

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast({
        title: t('messages.upload_failed'),
        description: t('messages.upload_failed_desc'),
        variant: "destructive",
      });
      return;
    }

    // Check limits
    if (acceptedFiles.length + files.length > maxFiles) {
      toast({
        title: t('messages.too_many_files'),
        description: t('messages.too_many_files_desc', { max: maxFiles }),
        variant: "destructive",
      });
      return;
    }

    for (const file of acceptedFiles) {
      if (file.size > maxPerFileBytes) {
        toast({
          title: t('messages.file_too_large'),
          description: t('messages.file_too_large_desc', { filename: file.name }),
          variant: "destructive",
        });
        return;
      }
    }

    // Read file contents
    let processedCount = 0;
    const newFiles: UploadedFileWithId[] = [];

    acceptedFiles.forEach((file) => {
      const isZipFile = file.name.toLowerCase().endsWith('.zip');
      
      if (isZipFile) {
        // For ZIP files, store file reference for later processing
        const newFile = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          content: `[ZIP Archive: ${file.name}]`, // Placeholder content
          isZip: true,
          file: file // Store the original file for later upload
        };
        
        newFiles.push(newFile);
        processedCount++;
        
        if (processedCount === acceptedFiles.length) {
          setFiles(prev => [...prev, ...newFiles]);
          toast({
            title: t('messages.files_uploaded'),
            description: t('messages.files_uploaded_desc', { count: acceptedFiles.length }),
          });
        }
      } else {
        // For text files, read content as before
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const newFile = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            content: content,
            isZip: false
          };
          
          newFiles.push(newFile);
          processedCount++;
          
          if (processedCount === acceptedFiles.length) {
            setFiles(prev => [...prev, ...newFiles]);
            toast({
              title: t('messages.files_uploaded'),
              description: t('messages.files_uploaded_desc', { count: acceptedFiles.length }),
            });
          }
        };
        
        reader.onerror = () => {
          processedCount++;
          toast({
            title: t('messages.upload_error'),
            description: t('messages.upload_error_desc', { filename: file.name }),
            variant: "destructive",
          });
        };
        
        reader.readAsText(file);
      }
    });
  }, [toast, files.length, maxFiles, maxPerFileBytes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/javascript': ['.js'],
      'text/javascript': ['.js'],
      'text/plain': ['.js', '.md', '.txt'],
      'text/markdown': ['.md'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    maxSize: maxPerFileBytes,
    maxFiles: maxFiles
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Helper function to process ZIP files
  const processZipFiles = async (filesToProcess: UploadedFileWithId[]): Promise<UploadedFileWithId[]> => {
    const processedFiles: UploadedFileWithId[] = [];
    
    for (const file of filesToProcess) {
      if (file.isZip && file.file) {
        try {
          // Process ZIP file using the ZIP extraction endpoint
          const formData = new FormData();
          formData.append('file', file.file, file.file.name);
          
          const zipResult = await postForm<{
            success: boolean;
            content: string;
            extractedFiles: number;
            metadata: any;
          }>('/api/zip/extract', formData);
          
          if (zipResult.success && zipResult.content) {
            // Replace ZIP file with extracted content
            processedFiles.push({
              id: file.id,
              name: `${file.name.replace('.zip', '')}_extracted.md`,
              size: zipResult.content.length,
              content: zipResult.content,
              isZip: false
            });
            
            toast({
              title: t('messages.zip_extracted'),
              description: t('messages.zip_extracted_desc', { 
                filename: file.name, 
                count: zipResult.extractedFiles 
              }),
            });
          } else {
            toast({
              title: t('messages.zip_extraction_failed'),
              description: t('messages.zip_extraction_failed_desc', { filename: file.name }),
              variant: "destructive",
            });
            // Keep original file if extraction fails
            processedFiles.push(file);
          }
        } catch (error) {
          console.error('ZIP processing error:', error);
          toast({
            title: t('messages.zip_extraction_failed'),
            description: t('messages.zip_extraction_failed_desc', { filename: file.name }),
            variant: "destructive",
          });
          // Keep original file if extraction fails
          processedFiles.push(file);
        }
      } else {
        // Keep non-ZIP files as is
        processedFiles.push(file);
      }
    }
    
    return processedFiles;
  };

  // Preview functionality
  const generatePreview = async () => {
    try {
      setIsGeneratingPreview(true);
      
      // Process ZIP files first
      const processedFiles = await processZipFiles(files);
      
      const form = new FormData();
      form.append("provider", previewProvider || "deepseek");
      form.append("mode", previewMode);
      form.append("title", title);
      if (previewMode === 'implement') form.append("feature", feature);
      form.append("acceptance", acceptance);
      if (previewMode === 'test') form.append("useCaseId", useCaseId);
      form.append("maxLines", maxLines.toString());
      form.append("useDirectPrompt", useDirectPrompt.toString());
      if (useDirectPrompt) {
        form.append("directPrompt", directPrompt);
      }

      for (const file of processedFiles) {
        if (!file.isZip) { // Only add non-ZIP files (ZIP files should be processed by now)
          const blob = new Blob([file.content], { type: 'application/javascript' });
          form.append("files", blob, file.name);
        }
      }

      const json = await postForm<{ previewId: string; text?: string; data?: any }>(
        "/api/prompts/preview",
        form
      );
      setPreviewResult(json);
    } catch (e: any) {
      toast({
        title: t('messages.preview_failed'),
        description: e.message || t('messages.preview_failed_desc'),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Generate functionality
  const generatePrompts = async () => {
    try {
      setIsGenerating(true);
      
      // Process ZIP files first
      const processedFiles = await processZipFiles(files);
      
      const form = new FormData();
      form.append("providers", JSON.stringify(providers));
      form.append("modes", JSON.stringify(modes));
      form.append("title", title);
      if (modes.includes('implement')) form.append("feature", feature);
      form.append("acceptance", acceptance);
      if (modes.includes('test')) form.append("useCaseId", useCaseId);
      form.append("maxLines", maxLines.toString());
      form.append("processing_mode", processingMode);
      form.append("useDirectPrompt", useDirectPrompt.toString());
      if (useDirectPrompt) {
        form.append("directPrompt", directPrompt);
      }

      for (const file of processedFiles) {
        if (!file.isZip) { // Only add non-ZIP files (ZIP files should be processed by now)
          const blob = new Blob([file.content], { type: 'application/javascript' });
          form.append("files", blob, file.name);
        }
      }

      const json = await postForm<{ jobId: string }>("/api/prompts/generate", form);
      setJobId(json.jobId);
      
      toast({
        title: t('messages.prompts_generated'),
        description: t('messages.prompts_generated_desc'),
      });
    } catch (e: any) {
      toast({
        title: t('messages.generation_failed'),
        description: e.message || t('messages.generation_failed_desc'),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // RobustKit test functionality
  const runRobustKit = async () => {
    try {
      setRkBusy(true);
      const json = await postJSON("/api/robustkit/run", {
        provider: rkProvider,
        model: rkModel,
        prompt: rkPrompt,
        mode: rkMode,
        temperature: rkTemp,
      });
      setRkResult(json);
    } catch (e: any) {
      toast({
        title: t('messages.robustkit_error'),
        description: e.message || t('messages.robustkit_error_desc'),
        variant: "destructive",
      });
    } finally {
      setRkBusy(false);
    }
  };

  // Download functionality
  const downloadPrompts = async () => {
    if (!jobId) return;
    
    try {
      const response = await fetch(`/api/prompts/${jobId}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'prompts.txt';
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t('messages.download_started'),
        description: t('messages.download_started_desc'),
      });
    } catch (error) {
      toast({
        title: t('messages.download_failed'), 
        description: t('messages.download_failed_desc'),
        variant: "destructive",
      });
    }
  };

  // Validation logic
  const canPreview = useMemo(() => {
    if (useDirectPrompt) {
      return !!directPrompt && !!previewProvider && !!previewMode;
    }
    return !!title && !!previewProvider && !!previewMode;
  }, [useDirectPrompt, directPrompt, title, previewProvider, previewMode]);
  
  const canGenerate = useMemo(() => {
    if (useDirectPrompt) {
      return !!directPrompt && providers.length > 0 && modes.length > 0;
    }
    return !!title && providers.length > 0 && modes.length > 0;
  }, [useDirectPrompt, directPrompt, title, providers, modes]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{t('header.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('header.description')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{t('header.status_ready')}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-6">
        
        {/* FILE UPLOAD SECTION - Zuerst Dateien hochladen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="w-5 h-5 mr-2 text-primary" />
              {t('sections.upload')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileDropzone 
              onDrop={onDrop}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              isDragActive={isDragActive}
              files={files}
              onRemoveFile={removeFile}
              data-testid="file-upload-zone"
            />
          </CardContent>
        </Card>
        
        {/* PREVIEW SECTION - Dann schnell testen mit einzelnem Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2 text-primary" />
              {t('sections.preview')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProviderSelector
                value={previewProvider}
                onChange={(v) => setPreviewProvider(v as string)}
                options={PROVIDERS}
                multi={false}
                label={t('labels.preview_provider')}
              />
              <ModeSelector
                value={previewMode}
                onChange={(v) => setPreviewMode(v as Mode)}
                multi={false}
                label={t('labels.preview_mode')}
              />
            </div>

            {/* Prompt Input Mode Toggle */}
            <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">{t('labels.prompt_mode')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={!useDirectPrompt ? "default" : "outline"}
                  onClick={() => setUseDirectPrompt(false)}
                  size="sm"
                  data-testid="button-structured-mode"
                >
                  {t('buttons.structured_mode')}
                </Button>
                <Button
                  variant={useDirectPrompt ? "default" : "outline"}
                  onClick={() => setUseDirectPrompt(true)}
                  size="sm"
                  data-testid="button-direct-prompt"
                >
                  {t('buttons.direct_prompt')}
                </Button>
              </div>
            </div>

            {useDirectPrompt ? (
              /* Direct Prompt Input */
              <div>
                <Label htmlFor="directPrompt">{t('forms.direct_prompt')}</Label>
                <Textarea
                  id="directPrompt"
                  rows={6}
                  value={directPrompt}
                  onChange={(e) => setDirectPrompt(e.target.value)}
                  placeholder={t('forms.direct_prompt_placeholder')}
                  data-testid="textarea-direct-prompt"
                />
              </div>
            ) : (
              /* Structured Fields */
              <>
                <div>
                  <Label htmlFor="title">{t('forms.task_title')}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('forms.task_title_placeholder')}
                    data-testid="input-title"
                  />
                </div>

                {previewMode === 'implement' && (
                  <div>
                    <Label htmlFor="feature">{t('forms.feature_description')}</Label>
                    <Textarea
                      id="feature"
                      rows={3}
                      value={feature}
                      onChange={(e) => setFeature(e.target.value)}
                      placeholder={t('forms.feature_description_placeholder')}
                      data-testid="textarea-feature"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="acceptance">{t('forms.acceptance_criteria')}</Label>
                  <Textarea
                    id="acceptance"
                    rows={2}
                    value={acceptance}
                    onChange={(e) => setAcceptance(e.target.value)}
                    placeholder={t('forms.acceptance_criteria_placeholder')}
                    data-testid="textarea-acceptance"
                  />
                </div>

                {previewMode === 'test' && (
                  <div>
                    <Label htmlFor="useCase">{t('forms.use_case_id')}</Label>
                    <Input
                      id="useCase"
                      value={useCaseId}
                      onChange={(e) => setUseCaseId(e.target.value)}
                      placeholder={t('forms.use_case_id_placeholder')}
                      data-testid="input-use-case"
                    />
                  </div>
                )}
              </>
            )}

            <Button 
              onClick={generatePreview} 
              disabled={!canPreview || isGeneratingPreview}
              data-testid="button-preview"
            >
              {isGeneratingPreview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('buttons.generating_preview')}
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('buttons.generate_preview')}
                </>
              )}
            </Button>

            {previewResult && (
              <div className="mt-4">
                <Label>{t('labels.preview_result')}</Label>
                <pre className="mt-2 p-3 bg-muted rounded-lg text-sm overflow-auto">
                  {JSON.stringify(previewResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GENERATE SECTION - Dann finale Generierung mit mehreren Providern */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              {t('sections.generate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProviderSelector
                value={providers}
                onChange={(v) => setProviders(v as string[])}
                options={PROVIDERS}
                multi={true}
                label={t('labels.generate_providers')}
              />
              <ModeSelector
                value={modes}
                onChange={(v) => setModes(v as Mode[])}
                multi={true}
                label={t('labels.generate_modes')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('labels.processing_mode')}</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={processingMode === "automatic" ? "default" : "outline"}
                    onClick={() => setProcessingMode("automatic")}
                    size="sm"
                    data-testid="button-automatic"
                  >
                    {t('buttons.automatic')}
                  </Button>
                  <Button
                    variant={processingMode === "manual" ? "default" : "outline"}
                    onClick={() => setProcessingMode("manual")}
                    size="sm"
                    data-testid="button-manual"
                  >
                    {t('buttons.manual')}
                  </Button>
                </div>
              </div>

              <div>
                <Label>{t('labels.max_lines_per_chunk')}</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Slider
                    value={[maxLines]}
                    onValueChange={(value) => setMaxLines(value[0])}
                    max={300}
                    min={50}
                    step={10}
                    className="flex-1"
                    data-testid="slider-max-lines"
                  />
                  <Badge variant="secondary" className="font-mono">
                    {maxLines}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={generatePrompts}
                disabled={!canGenerate || isGenerating}
                className="flex-1"
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('buttons.generating')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {t('buttons.generate_prompts')}
                  </>
                )}
              </Button>

              {jobId && (
                <Button
                  onClick={downloadPrompts}
                  variant="outline"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('buttons.download')}
                </Button>
              )}
            </div>

            {jobId && (
              <div className="text-sm text-muted-foreground">
                {t('labels.job_started')}: <code className="bg-muted px-1 rounded">{jobId}</code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ROBUSTKIT TEST SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TestTube className="w-5 h-5 mr-2 text-primary" />
              {t('sections.test')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rkPrompt">{t('forms.test_prompt')}</Label>
              <Textarea
                id="rkPrompt"
                value={rkPrompt}
                onChange={(e) => setRkPrompt(e.target.value)}
                placeholder={t('forms.test_prompt_placeholder')}
                data-testid="textarea-rk-prompt"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>{t('forms.provider')}</Label>
                <select 
                  className="w-full mt-1 border rounded p-2" 
                  value={rkProvider} 
                  onChange={(e) => setRkProvider(e.target.value)}
                  data-testid="select-rk-provider"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>{t('forms.model')}</Label>
                <Input 
                  value={rkModel} 
                  onChange={(e) => setRkModel(e.target.value)} 
                  placeholder="e.g. mini / large / gpt-4.x"
                  data-testid="input-rk-model"
                />
              </div>

              <div>
                <Label>{t('forms.mode')}</Label>
                <select 
                  className="w-full mt-1 border rounded p-2" 
                  value={rkMode} 
                  onChange={(e) => setRkMode(e.target.value as any)}
                  data-testid="select-rk-mode"
                >
                  <option value="dry">dry</option>
                  <option value="draft">draft</option>
                  <option value="live">live</option>
                </select>
              </div>

              <div>
                <Label>{t('forms.temperature')}</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="2" 
                  value={rkTemp} 
                  onChange={(e) => setRkTemp(parseFloat(e.target.value) || 0)}
                  data-testid="input-rk-temperature"
                />
              </div>
            </div>

            <Button 
              onClick={runRobustKit} 
              disabled={rkBusy || !rkPrompt}
              data-testid="button-run-robustkit"
            >
              {rkBusy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('buttons.running_test')}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {t('buttons.run_test')}
                </>
              )}
            </Button>

            {rkResult && (
              <div className="mt-4">
                <Label>{t('labels.test_result')}</Label>
                <pre className="mt-2 p-3 bg-muted rounded-lg text-sm overflow-auto">
                  {JSON.stringify(rkResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GitHub Push Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              {t('sections.github_integration') || 'GitHub Integration'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GitHubPush />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}