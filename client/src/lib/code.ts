import { apiRequest } from "./queryClient";

export interface CodeAnalysisRequest {
  code: string;
  providers: string[];
  mode?: string;
}

export interface CodeAnalysisResponse {
  chunks: Array<{
    id: string;
    start: number;
    end: number;
    lines: number;
  }>;
  results: Array<{
    provider: string;
    chunks: Array<{
      id: string;
      text: string;
      metrics: {
        provider: string;
        model?: string;
        latency_ms: number;
        tokens_in: number;
        tokens_out: number;
        cost_eur: number;
        quality: number;
      };
    }>;
    error?: string;
  }>;
  totalChunks: number;
  mode: string;
}

export interface ChunkContentResponse {
  id: string;
  text: string;
  start: number;
  end: number;
  lines: number;
}

export async function analyzeCodeChunks(
  code: string, 
  providers: string[], 
  mode = "review"
): Promise<CodeAnalysisResponse> {
  return apiRequest("/api/code/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, providers, mode }),
  });
}

export async function getChunkContent(
  chunkId: string, 
  code: string
): Promise<ChunkContentResponse> {
  return apiRequest(`/api/code/chunk/${chunkId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });
}

export function calculateTotalCost(results: CodeAnalysisResponse['results']): number {
  return results.reduce((total, providerResult) => {
    return total + providerResult.chunks.reduce((providerTotal, chunk) => {
      return providerTotal + chunk.metrics.cost_eur;
    }, 0);
  }, 0);
}

export function getTopQualityProvider(results: CodeAnalysisResponse['results']): string | null {
  if (!results.length) return null;
  
  const providerAverages = results.map(result => {
    const totalQuality = result.chunks.reduce((sum, chunk) => sum + chunk.metrics.quality, 0);
    const avgQuality = totalQuality / result.chunks.length;
    return { provider: result.provider, quality: avgQuality };
  });
  
  const topProvider = providerAverages.reduce((best, current) => 
    current.quality > best.quality ? current : best
  );
  
  return topProvider.provider;
}