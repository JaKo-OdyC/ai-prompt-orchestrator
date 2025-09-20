// Metriken & Heuristiken (Kosten, Tokens, Score)

export async function timed<T>(fn: () => Promise<T>): Promise<{ res: T; latency_ms: number }> {
  const t0 = Date.now();
  const res = await fn();
  return { res, latency_ms: Date.now() - t0 };
}

// grobe Token-Schätzung (~ 4 chars/Token)
export function estTokens(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  const approx = Math.ceil(chars / 4);
  return Math.max(1, approx);
}

// Preis-Katalog (€/1k Tokens) – wird durch CONFIG ersetzt
import { CONFIG } from "../config";
const PRICE_TABLE = CONFIG.PRICE;

export function priceCalc(provider: string, tokens_in: number, tokens_out: number): number {
  const p = (PRICE_TABLE as any)[provider] || PRICE_TABLE.default;
  const perKIn = p.in ?? PRICE_TABLE.default.in;
  const perKOut = p.out ?? perKIn;
  const eur = (tokens_in * perKIn + tokens_out * perKOut) / 1000;
  return Math.round(eur * 1000) / 1000; // auf 1/1000 € runden
}

// sehr einfache Qualitäts-Heuristik 0..1 (Struktur, Klarheit, Kürze)
export function heuristicScore(text: string): number {
  if (!text) return 0;

  const len = text.length;
  const bullets = (text.match(/^\s*[-*•]/gm) || []).length;
  const codeFences = (text.match(/```/g) || []).length / 2;
  const headings = (text.match(/^#{1,6}\s+/gm) || []).length;
  const paragraphs = (text.split(/\n\s*\n/).length) || 1;

  // Basisscore nach Struktur
  let score = 0;
  score += Math.min(0.3, bullets * 0.03);
  score += Math.min(0.3, codeFences * 0.06);
  score += Math.min(0.2, headings * 0.04);
  score += Math.min(0.2, Math.max(0, 5 - Math.abs(paragraphs - 6)) * 0.03); // leichte Bevorzugung 4–8 Abschnitte

  // Penalty für zu lang/zu kurz
  if (len < 300) score *= 0.7;
  if (len > 8000) score *= 0.8;

  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

export type ProviderMetrics = {
  provider: string;
  model?: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost_eur: number;
  quality: number; // 0..1
};

export function buildMetrics(args: Omit<ProviderMetrics, "quality"> & { text: string }): ProviderMetrics {
  const quality = heuristicScore(args.text);
  return {
    provider: args.provider,
    model: args.model,
    latency_ms: args.latency_ms,
    tokens_in: args.tokens_in,
    tokens_out: args.tokens_out,
    cost_eur: args.cost_eur,
    quality,
  };
}