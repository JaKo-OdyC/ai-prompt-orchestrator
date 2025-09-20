import React from "react";

export type ProviderId = "deepseek" | "kimi" | "openai" | "anthropic" | "mistral" | "perplexity" | "replit";

export interface ProviderOption {
  id: ProviderId | string;
  label: string;
  hint?: string;
}

export function ProviderSelector({
  value,
  onChange,
  options,
  multi = false,
  disabled = false,
  label = "Provider",
}: {
  /** single: string | multi: string[] */
  value: string | string[];
  onChange: (val: string | string[]) => void;
  options: ProviderOption[];
  multi?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);

  function toggle(id: string) {
    if (!multi) {
      onChange(id);
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.id)}
              className={[
                "px-3 py-1 rounded-full border text-sm transition",
                active
                  ? "border-transparent bg-black text-white dark:bg-white dark:text-black"
                  : "border-gray-300 hover:border-gray-400",
                disabled ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
              aria-pressed={active}
              title={opt.hint || opt.label}
              data-testid={`button-provider-${opt.id}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {multi && (
        <div className="text-xs text-gray-500">
          Multi-select active – click multiple providers.
        </div>
      )}
    </div>
  );
}