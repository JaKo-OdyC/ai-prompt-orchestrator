{{ROLE_BLOCK}}
{{REPLIT_GUARDS}}

TASK: {{TASK_TITLE}}

CHANGE REQUEST (if implement mode):
{{FEATURE_BLOCK}}

ACCEPTANCE (measurable):
{{ACCEPTANCE_BLOCK}}

CONTEXT CAPSULE
- Use ONLY the provided code snippets (<=120 lines each).
- No new dependencies, no build/script changes, no telemetry, no environment keys.
- Keep CommonJS style and the existing exports/signatures.
- Minimal patch. No refactors unless explicitly asked.

CODE SNIPPETS
{{CONTEXT_BLOCKS}}

PROVIDER GUARDRAILS (Replit Draft)
- Produce a fourth proposal alongside other LLMs.
- Return output in the strict required format without extra prose.
- Do not execute or transform the code; generate text only.

OUTPUT FORMAT (STRICT)
{{OUTPUT_BLOCK}}
