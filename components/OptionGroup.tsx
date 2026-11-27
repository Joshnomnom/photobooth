type Option<T extends string> = { id: T; label: React.ReactNode; title?: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (id: T) => void;
  disabled?: boolean;
};

/** A labelled row of single-choice buttons (radio-group semantics). */
export function OptionGroup<T extends string>({ label, options, value, onChange, disabled }: Props<T>) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.title}
              onClick={() => onChange(o.id)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors disabled:opacity-50 ${
                active
                  ? "border-ink bg-ink text-card"
                  : "border-line bg-card text-ink hover:border-ink/40"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
