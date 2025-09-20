{{ROLE_BLOCK}}
{{REPLIT_GUARDS}}

TASK: {{TASK_TITLE}}

CHANGE REQUEST (if implement mode):
{{FEATURE_BLOCK}}

ACCEPTANCE (measurable):
{{ACCEPTANCE_BLOCK}}

CONTEXT CAPSULE
- Work ONLY with the provided segments.
- Keep CommonJS; do not change exports/signatures.
- No deps/build/telemetry/env keys.

CODE SNIPPETS
{{CONTEXT_BLOCKS}}

PROVIDER GUARDRAILS (Kimi)
- Deterministic edits only.
- Exactly one inline rationale comment per change in the form: // rationale: ...
- No symbol renames. No dead code.

OUTPUT FORMAT
{{OUTPUT_BLOCK}}
