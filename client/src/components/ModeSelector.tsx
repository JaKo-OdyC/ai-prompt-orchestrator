import React from "react";
import { useTranslation } from "react-i18next";

export type Mode = "implement" | "analyze" | "review" | "test";
const ALL_MODES: Mode[] = ["implement", "analyze", "review", "test"];

export function ModeSelector({
  value,
  onChange,
  multi = false,
  disabled = false,
  label = "Mode",
}: {
  /** single: Mode | multi: Mode[] */
  value: Mode | Mode[];
  onChange: (val: Mode | Mode[]) => void;
  multi?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useTranslation();
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);

  function toggle(m: Mode) {
    if (!multi) {
      onChange(m);
      return;
    }
    const next = new Set(selected);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    onChange(Array.from(next) as Mode[]);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {ALL_MODES.map((m) => {
          const active = selected.has(m);
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => toggle(m)}
              className={[
                "px-3 py-1 rounded-full border text-sm transition",
                active
                  ? "border-transparent bg-black text-white dark:bg-white dark:text-black"
                  : "border-gray-300 hover:border-gray-400",
                disabled ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
              aria-pressed={active}
              data-testid={`button-mode-${m}`}
            >
              {t(`modes.${m}`)}
            </button>
          );
        })}
      </div>
      {multi && (
        <div className="text-xs text-gray-500">
          Multi-select active – click multiple modes.
        </div>
      )}
    </div>
  );
}