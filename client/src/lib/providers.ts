import type { ProviderOption } from "@/components/ProviderSelector";

export const PROVIDERS: ProviderOption[] = [
  { id: "deepseek",  label: "DeepSeek",  hint: "Fast & cost-effective (Light suitable)" },
  { id: "kimi",      label: "Kimi",      hint: "Strong with long context" },
  { id: "openai",    label: "OpenAI",    hint: "Broad model ecosystem" },
  { id: "anthropic", label: "Anthropic", hint: "Good reasoning & safety" },
  { id: "mistral",   label: "Mistral",   hint: "EU-friendly, fast" },
  { id: "perplexity", label: "Perplexity", hint: "Research-focused reasoning" },
  { id: "replit",    label: "Replit",    hint: "Development-optimized" },
];