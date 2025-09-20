// Module service integrating hardened storage with AI providers
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { ModuleManager } from "../../packages/module-manager/src/core";
import { PostgresModuleStorage } from "../../packages/module-manager/src/postgresStorage";
import type { AuthContext } from "../../packages/module-manager/src/auth";
import { PROVIDER_CONFIGS } from "./ai-providers";

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Initialize module storage and manager
const moduleStorage = new PostgresModuleStorage(db);
export const moduleManager = new ModuleManager(moduleStorage as any);

// Tool Module definitions
export const TOOL_MODULES = [
  {
    id: "zip-extractor",
    name: "ZIP Archive Extractor",
    kind: "tool" as const,
    description: "Extract and process ZIP archives for code analysis and prompt generation",
    capabilities: [
      { id: "file_extraction", label: "File Extraction" },
      { id: "archive_processing", label: "Archive Processing" },
      { id: "content_filtering", label: "Content Filtering" },
      { id: "flat_bundle_generation", label: "Flat Bundle Generation" }
    ],
    meta: {
      tool: "zip_extractor",
      supportedFormats: [".zip"],
      maxArchiveSize: "50MB",
      processingEngine: "zip_to_flatbundle",
      scriptPath: "attached_assets/tools/zip_to_flatbundle/scripts/zip_to_flatbundle.js"
    },
    config: {
      maxFiles: 500,
      maxFileSizeBytes: 10 * 1024 * 1024, // 10MB per file
      includeExtensions: ".js,.ts,.tsx,.py,.java,.go,.rs,.cpp,.cc,.c,.hpp,.h,.md,.json,.yml,.yaml,.sh,.css,.scss,.html,.xml,.toml,.ini,.gradle,.cs,.rb,.php",
      excludeDirectories: "node_modules,.git,build,dist,out,.next,.cache,.venv,__pycache__",
      enableCodeFencing: true,
      generateTOC: true,
      timeout: 30000
    }
  }
];

// AI Provider Module definitions
export const AI_PROVIDER_MODULES = [
  {
    id: "openai",
    name: "OpenAI",
    kind: "service" as const,
    description: "OpenAI GPT models for code analysis and generation",
    capabilities: [
      { id: "chat_completion", label: "Chat Completion" },
      { id: "code_analysis", label: "Code Analysis" },
      { id: "text_generation", label: "Text Generation" }
    ],
    meta: {
      provider: "openai",
      models: PROVIDER_CONFIGS.openai.models,
      defaultModel: PROVIDER_CONFIGS.openai.defaultModel,
      apiEndpoint: "https://api.openai.com/v1"
    },
    config: {
      apiKey: process.env.OPENAI_API_KEY || "",
      temperature: 0.1,
      maxTokens: 2000
    }
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    kind: "service" as const,
    description: "Anthropic Claude models for intelligent code review and implementation",
    capabilities: [
      { id: "chat_completion", label: "Chat Completion" },
      { id: "code_review", label: "Code Review" },
      { id: "analysis", label: "Analysis" }
    ],
    meta: {
      provider: "anthropic",
      models: PROVIDER_CONFIGS.anthropic.models,
      defaultModel: PROVIDER_CONFIGS.anthropic.defaultModel,
      apiEndpoint: "https://api.anthropic.com/v1"
    },
    config: {
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      temperature: 0.1,
      maxTokens: 2000
    }
  },
  {
    id: "deepseek",
    name: "DeepSeek Coder",
    kind: "service" as const,
    description: "DeepSeek specialized models for code generation and analysis",
    capabilities: [
      { id: "code_generation", label: "Code Generation" },
      { id: "code_completion", label: "Code Completion" },
      { id: "debugging", label: "Debugging" }
    ],
    meta: {
      provider: "deepseek",
      models: PROVIDER_CONFIGS.deepseek.models,
      defaultModel: PROVIDER_CONFIGS.deepseek.defaultModel,
      apiEndpoint: "https://api.deepseek.com"
    },
    config: {
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      temperature: 0.1,
      maxTokens: 2000
    }
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    kind: "service" as const,
    description: "Perplexity AI models with online search capabilities",
    capabilities: [
      { id: "search_completion", label: "Search Completion" },
      { id: "research", label: "Research" },
      { id: "fact_checking", label: "Fact Checking" }
    ],
    meta: {
      provider: "perplexity",
      models: PROVIDER_CONFIGS.perplexity.models,
      defaultModel: PROVIDER_CONFIGS.perplexity.defaultModel,
      apiEndpoint: "https://api.perplexity.ai"
    },
    config: {
      apiKey: process.env.PERPLEXITY_API_KEY || "",
      temperature: 0.1,
      maxTokens: 2000
    }
  }
];

// Enterprise Feature Module definitions
export const ENTERPRISE_MODULES = [
  {
    id: "cost-tracker",
    name: "Cost Tracker & Analytics",
    kind: "service" as const,
    description: "Real-time cost calculation, provider comparison, and budget tracking for AI operations",
    capabilities: [
      { id: "cost_calculation", label: "Cost Calculation" },
      { id: "provider_comparison", label: "Provider Cost Comparison" },
      { id: "budget_tracking", label: "Budget Tracking" },
      { id: "token_estimation", label: "Token Estimation" },
      { id: "cost_reports", label: "Cost Reports Generation" }
    ],
    meta: {
      version: "1.0.0",
      category: "analytics",
      supportedProviders: ["openai", "anthropic", "deepseek", "perplexity", "kimi", "mistral"],
      pricingModel: "token-based",
      currency: "EUR",
      updateFrequency: "real-time"
    },
    config: {
      enableRealTimeTracking: true,
      budgetAlerts: true,
      defaultCurrency: "EUR",
      costThresholds: {
        warning: 10.0,
        critical: 50.0
      },
      reportingInterval: 3600000, // 1 hour in ms
      tokenEstimationMethod: "character-based"
    }
  },
  {
    id: "quality-scorer",
    name: "Quality Scorer & Content Analyzer",
    kind: "service" as const,
    description: "Heuristic quality assessment and content analysis for AI-generated responses",
    capabilities: [
      { id: "heuristic_scoring", label: "Heuristic Scoring" },
      { id: "content_analysis", label: "Content Analysis" },
      { id: "structure_detection", label: "Structure Detection" },
      { id: "quality_metrics", label: "Quality Metrics" },
      { id: "comparative_analysis", label: "Comparative Analysis" }
    ],
    meta: {
      version: "1.0.0",
      category: "analysis",
      scoringAlgorithm: "heuristic-v1",
      scoreRange: "0-1",
      analysisDepth: "structural-semantic",
      benchmarkDataset: "enterprise-prompts"
    },
    config: {
      enableStructureAnalysis: true,
      enableLengthPenalties: true,
      qualityWeights: {
        structure: 0.4,
        clarity: 0.3,
        completeness: 0.3
      },
      lengthThresholds: {
        min: 300,
        max: 8000,
        optimal: 2000
      },
      structuralElements: {
        bullets: 0.03,
        codeFences: 0.06,
        headings: 0.04,
        paragraphs: 0.03
      }
    }
  },
  {
    id: "cache-manager",
    name: "Cache Manager & Performance Optimizer",
    kind: "service" as const,
    description: "TTL-based caching, request deduplication, and performance optimization for AI operations",
    capabilities: [
      { id: "ttl_caching", label: "TTL Caching" },
      { id: "request_deduplication", label: "Request Deduplication" },
      { id: "performance_optimization", label: "Performance Optimization" },
      { id: "cache_invalidation", label: "Cache Invalidation" },
      { id: "memory_management", label: "Memory Management" }
    ],
    meta: {
      version: "1.0.0",
      category: "performance",
      cacheStrategy: "lru-ttl",
      hashingAlgorithm: "sha1",
      storageType: "in-memory",
      compressionEnabled: false
    },
    config: {
      defaultTTL: 120000, // 2 minutes
      maxCacheSize: 1000,
      enableCompression: false,
      enableMetrics: true,
      cleanupInterval: 300000, // 5 minutes
      keyPrefix: "prompt_cache_",
      hashLength: 12
    }
  },
  {
    id: "parallel-processor",
    name: "Parallel Processor & Batch Engine",
    kind: "service" as const,
    description: "Concurrent execution engine for parallel AI provider processing and batch operations",
    capabilities: [
      { id: "concurrent_execution", label: "Concurrent Execution" },
      { id: "batch_processing", label: "Batch Processing" },
      { id: "latency_reduction", label: "Latency Reduction" },
      { id: "load_balancing", label: "Load Balancing" },
      { id: "error_handling", label: "Error Handling" }
    ],
    meta: {
      version: "1.0.0",
      category: "performance",
      executionModel: "promise-all",
      maxConcurrency: 10,
      latencyImprovement: "70-85%",
      errorStrategy: "graceful-degradation"
    },
    config: {
      maxConcurrentRequests: 10,
      timeoutMs: 30000,
      retryAttempts: 3,
      retryBackoff: "exponential",
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      batchSize: 5
    }
  },
  {
    id: "audit-trail",
    name: "Audit Trail & Compliance Logger",
    kind: "service" as const,
    description: "Comprehensive audit logging, job persistence, and compliance tracking for enterprise operations",
    capabilities: [
      { id: "job_persistence", label: "Job Persistence" },
      { id: "compliance_logging", label: "Compliance Logging" },
      { id: "history_tracking", label: "History Tracking" },
      { id: "audit_reports", label: "Audit Reports" },
      { id: "data_retention", label: "Data Retention" }
    ],
    meta: {
      version: "1.0.0",
      category: "compliance",
      storageFormat: "jsonl",
      retentionPolicy: "200-items",
      complianceStandards: ["GDPR", "SOX", "HIPAA"],
      auditLevel: "comprehensive"
    },
    config: {
      maxHistoryItems: 200,
      enableFullAudit: true,
      retentionDays: 90,
      compressionEnabled: true,
      encryptSensitiveData: true,
      logLevel: "info",
      includeMetrics: true,
      jsonlPath: "jobs.jsonl"
    }
  },
  {
    id: "gdpr-redactor",
    name: "GDPR Data Redactor & Privacy Shield",
    kind: "tool" as const,
    description: "Intelligent data redaction and privacy protection with pattern detection for GDPR compliance",
    capabilities: [
      { id: "data_redaction", label: "Data Redaction" },
      { id: "pattern_detection", label: "Pattern Detection" },
      { id: "privacy_protection", label: "Privacy Protection" },
      { id: "code_preservation", label: "Code Preservation" },
      { id: "compliance_validation", label: "Compliance Validation" }
    ],
    meta: {
      version: "1.0.0",
      category: "privacy",
      complianceStandard: "GDPR",
      detectionAlgorithm: "regex-ml-hybrid",
      preservationStrategy: "code-fence-aware",
      redactionMethod: "pattern-replacement"
    },
    config: {
      enableEmailRedaction: true,
      enablePhoneRedaction: true,
      enableIbanRedaction: true,
      enableSecretRedaction: true,
      enablePathRedaction: true,
      preserveCodeFences: true,
      redactionMarker: "[REDACTED]",
      patterns: {
        email: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
        phone: "\\+?[1-9]\\d{1,14}",
        iban: "[A-Z]{2}\\d{2}[A-Z0-9]{4}\\d{7}([A-Z0-9]?){0,16}",
        secret: "(api[_-]?key|secret|token|password)\\s*[:=]\\s*['\"]?[A-Za-z0-9+/=]{8,}['\"]?"
      }
    }
  },
  {
    id: "decision-engine",
    name: "Decision Engine & Provider Optimizer",
    kind: "service" as const,
    description: "Intelligent provider selection with transparent decision-making and configurable optimization weights",
    capabilities: [
      { id: "provider_selection", label: "Provider Selection" },
      { id: "weight_optimization", label: "Weight Optimization" },
      { id: "explanation_generation", label: "Explanation Generation" },
      { id: "ranking_algorithms", label: "Ranking Algorithms" },
      { id: "decision_transparency", label: "Decision Transparency" }
    ],
    meta: {
      version: "1.0.0",
      category: "optimization",
      decisionAlgorithm: "weighted-scoring",
      optimizationStrategy: "multi-objective",
      transparencyLevel: "full-explanation",
      adaptiveLearning: false
    },
    config: {
      defaultWeights: {
        quality: 0.6,
        cost: 0.2,
        latency: 0.2
      },
      enableAdaptiveLearning: false,
      explainAllDecisions: true,
      rankingMethod: "weighted-sum",
      minimumQualityThreshold: 0.3,
      costSensitivity: "medium",
      latencySensitivity: "medium"
    }
  },
  {
    id: "metrics-collector",
    name: "Metrics Collector & Performance Monitor",
    kind: "service" as const,
    description: "Comprehensive performance metrics collection, health monitoring, and analytics dashboard",
    capabilities: [
      { id: "performance_metrics", label: "Performance Metrics" },
      { id: "health_monitoring", label: "Health Monitoring" },
      { id: "usage_analytics", label: "Usage Analytics" },
      { id: "trend_analysis", label: "Trend Analysis" },
      { id: "alerting", label: "Alerting" }
    ],
    meta: {
      version: "1.0.0",
      category: "monitoring",
      metricsFormat: "structured-json",
      collectionFrequency: "real-time",
      retentionPeriod: "30-days",
      aggregationLevels: ["minute", "hour", "day"]
    },
    config: {
      enableRealTimeMetrics: true,
      metricsRetentionDays: 30,
      alertThresholds: {
        latency: 5000,
        errorRate: 0.05,
        costPerHour: 10.0
      },
      aggregationIntervals: {
        minute: 60000,
        hour: 3600000,
        day: 86400000
      },
      enableTrendAnalysis: true,
      exportFormat: "prometheus"
    }
  }
];

// Service Module definitions  
export const SERVICE_MODULES = [
  {
    id: "module-manager",
    name: "Module Manager",
    kind: "service" as const,
    description: "Core module management and orchestration service",
    capabilities: [
      { id: "module_lifecycle", label: "Module Lifecycle" },
      { id: "dependency_management", label: "Dependency Management" },
      { id: "configuration_management", label: "Configuration Management" },
      { id: "status_monitoring", label: "Status Monitoring" }
    ],
    meta: {
      version: "1.0.0",
      storageType: "postgresql",
      encryptionEnabled: true
    },
    config: {
      autoStart: true,
      healthCheckInterval: 60000,
      logLevel: "info"
    }
  }
];

// Combined modules array
export const ALL_MODULES = [...TOOL_MODULES, ...AI_PROVIDER_MODULES, ...ENTERPRISE_MODULES, ...SERVICE_MODULES];

// Initialize all modules
export async function initializeModules(auth: AuthContext) {
  console.log("Initializing all modules...");
  
  for (const moduleConfig of ALL_MODULES) {
    try {
      // Check if module already exists
      const existing = await moduleStorage.get(moduleConfig.id);
      
      if (!existing) {
        // Create new module
        await moduleStorage.upsert({
          ...moduleConfig,
          status: "unknown",
          lastSync: new Date().toISOString()
        } as any, auth);
        
        console.log(`Initialized module: ${moduleConfig.name} (${moduleConfig.kind})`);
      } else {
        console.log(`Module already exists: ${moduleConfig.name}`);
      }
    } catch (error) {
      console.error(`Failed to initialize module ${moduleConfig.name}:`, error);
    }
  }
  
  console.log("Module initialization complete");
}

// Backwards compatibility
export async function initializeAIProviderModules(auth: AuthContext) {
  return initializeModules(auth);
}

// Get module configuration for a provider
export async function getProviderModule(providerId: string) {
  return await moduleStorage.get(providerId);
}

// Update module status
export async function updateModuleStatus(moduleId: string, status: "connected" | "disconnected" | "error", auth: AuthContext) {
  await moduleManager.setStatus(moduleId, status);
}