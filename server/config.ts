export const CONFIG = {
  PRICE: {
    deepseek: { 
      in: +(process.env.PRICE_DEEPSEEK_IN ?? 0.2), 
      out: +(process.env.PRICE_DEEPSEEK_OUT ?? 0.2) 
    },
    kimi: { 
      in: +(process.env.PRICE_KIMI_IN ?? 0.6), 
      out: +(process.env.PRICE_KIMI_OUT ?? 0.6) 
    },
    openai: { 
      in: +(process.env.PRICE_OPENAI_IN ?? 2.5), 
      out: +(process.env.PRICE_OPENAI_OUT ?? 10.0) 
    },
    anthropic: { 
      in: +(process.env.PRICE_ANTHRO_IN ?? 3.0), 
      out: +(process.env.PRICE_ANTHRO_OUT ?? 15.0) 
    },
    perplexity: { 
      in: +(process.env.PRICE_PERPLEXITY_IN ?? 0.8), 
      out: +(process.env.PRICE_PERPLEXITY_OUT ?? 1.2) 
    },
    mistral: { 
      in: +(process.env.PRICE_MISTRAL_IN ?? 0.3), 
      out: +(process.env.PRICE_MISTRAL_OUT ?? 0.9) 
    },
    default: { 
      in: +(process.env.PRICE_DEFAULT_IN ?? 1.0), 
      out: +(process.env.PRICE_DEFAULT_OUT ?? 1.0) 
    },
  },
  PROVIDERS: JSON.parse(process.env.PROVIDERS_JSON ?? `[
    {"id":"deepseek","models":["mini","large"]},
    {"id":"kimi","models":["k1","k1.5"]},
    {"id":"openai","models":["gpt-4.1","o3-mini"]},
    {"id":"anthropic","models":["claude-3-5-sonnet","haiku"]},
    {"id":"perplexity","models":["sonar-small","sonar-medium"]},
    {"id":"mistral","models":["mistral-small","mistral-medium"]}
  ]`)
};