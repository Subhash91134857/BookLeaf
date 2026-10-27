export const Card = ({ className = '', children }) => (
  <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>
);
export const CardHeader = ({ title, action }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
    <h2 className="text-base font-semibold">{title}</h2>
    {action}
  </div>
);
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);
export const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="label">{label}{children}</label>
    {error ? <p className="mt-1 text-xs text-critical-fg">{error}</p> : hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
);
