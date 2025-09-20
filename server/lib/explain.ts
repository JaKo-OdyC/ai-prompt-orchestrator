import type { ProviderMetrics } from "./measure";

// Erklärt die Entscheidung (ohne KI)
export function explainDecision(
  metrics: ProviderMetrics[],
  weights = { quality: 0.6, cost: 0.2, latency: 0.2 }
) {
  // Scoring: Qualität hoch = gut, Kosten/Latenz niedrig = gut
  const ranked = metrics
    .map((m) => {
      const q = m.quality;                 // 0..1
      const c = 1 / (1 + m.cost_eur);      // 0..1+
      const l = 1 / (1 + m.latency_ms / 1000); // kürzer besser
      const total = q * weights.quality + c * weights.cost + l * weights.latency;
      return { ...m, total };
    })
    .sort((a, b) => b.total - a.total);

  const winner = ranked[0];

  const rationale = `Auswahl: ${winner.provider} – hohe Qualität (${winner.quality.toFixed(2)}), ` +
    `akzeptable Kosten (~${winner.cost_eur.toFixed(3)}€) und Latenz (${winner.latency_ms} ms).`;

  return {
    winner: winner.provider,
    ranking: ranked.map(({ provider, total }) => ({ provider, score: Number(total.toFixed(3)) })),
    rationale,
    weights,
  };
}