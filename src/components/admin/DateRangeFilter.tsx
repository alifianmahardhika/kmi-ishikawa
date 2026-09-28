export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const inputStyle = { borderColor: "var(--surface-border)", background: "var(--bg)" };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="filter-from" className="block text-xs text-muted mb-1">
          Dari tanggal
        </label>
        <input
          id="filter-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded-lg border px-2 py-1.5 text-sm"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="filter-to" className="block text-xs text-muted mb-1">
          Sampai tanggal
        </label>
        <input
          id="filter-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded-lg border px-2 py-1.5 text-sm"
          style={inputStyle}
        />
      </div>
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          className="text-sm text-muted hover:text-(--text) !py-1.5"
        >
          Reset
        </button>
      )}
    </div>
  );
}
