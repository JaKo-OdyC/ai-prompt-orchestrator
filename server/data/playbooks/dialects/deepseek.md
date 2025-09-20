{{ROLE_BLOCK}}
{{REPLIT_GUARDS}}

TASK: {{TASK_TITLE}}

CHANGE REQUEST (if implement mode):
{{FEATURE_BLOCK}}

ACCEPTANCE (measurable):
{{ACCEPTANCE_BLOCK}}

CONTEXT CAPSULE
- Operate ONLY on the snippets below (<=120 lines each).
- Do NOT infer the larger system.
- No deps/build/telemetry/env keys.
- Keep CommonJS style and existing exports/signatures.
- Minimal patch; no refactors unless explicitly asked.

CODE SNIPPETS
{{CONTEXT_BLOCKS}}

PROVIDER GUARDRAILS (DeepSeek)
- Precise, minimal patching.
- No refactors unless explicitly asked.
- Output discipline.

OUTPUT FORMAT
{{OUTPUT_BLOCK}}
