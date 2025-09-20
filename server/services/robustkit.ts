import type { RunInput, RunOutput } from '@shared/schema';
import { AIProviderService } from './ai-providers';

/**
 * RobustKit service with real AI provider integration
 * Provides normalized AI provider responses with proper mode handling
 */

// In-memory cache for draft mode
const cache = new Map<string, string>();

// Initialize AI provider service
const aiService = new AIProviderService();

/**
 * Run AI provider with real API integration
 * Maintains RobustKit semantics with actual provider calls
 */
export async function run({ 
  provider, 
  model, 
  prompt, 
  temperature = 0.2, 
  mode = 'draft' 
}: RunInput): Promise<RunOutput> {
  try {
    // Validate provider exists
    const availableProviders = aiService.getAvailableProviders();
    if (!availableProviders.includes(provider)) {
      return {
        provider,
        model,
        status: 'error',
        latency_ms: 0,
        error: `Provider ${provider} not configured`,
      };
    }

    // dry: latency_ms must be 0, no provider call
    if (mode === 'dry') {
      return { 
        provider, 
        model, 
        status: 'ok', 
        latency_ms: 0, 
        text: 'DRY RUN' 
      };
    }

    // draft: check cache first
    if (mode === 'draft') {
      const key = provider + model + prompt;
      const hit = cache.get(key);
      if (hit !== undefined) {
        return { 
          provider, 
          model, 
          status: 'ok', 
          latency_ms: 0, 
          text: hit 
        };
      }
    }

    // Call AI provider service
    const result = await aiService.callProvider(provider, model, prompt, mode);
    
    // Handle draft mode caching
    if (mode === 'draft' && result.status === 'ok' && result.text) {
      const key = provider + model + prompt;
      cache.set(key, result.text);
      // Override latency_ms for draft mode
      result.latency_ms = 0;
    }

    return result;

  } catch (error) {
    return {
      provider,
      model,
      status: 'error',
      latency_ms: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Clear the draft cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}