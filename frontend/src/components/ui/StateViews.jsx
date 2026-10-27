import Button from './Button';

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-3 py-12 text-muted" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
    {label}
  </div>
);
export const EmptyState = ({ title, hint, action }) => (
  <div className="px-6 py-12 text-center">
    <p className="font-medium">{title}</p>
    {hint && <p className="mx-auto mt-1 max-w-sm text-muted">{hint}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);
export const ErrorState = ({ error, onRetry }) => (
  <div className="px-6 py-10 text-center" role="alert">
    <p className="font-medium">We couldn’t load this.</p>
    <p className="mt-1 text-muted">{error?.message}</p>
    {onRetry && <div className="mt-4 flex justify-center"><Button variant="secondary" onClick={onRetry}>Try again</Button></div>}
  </div>
);
export function Async({ state, children }) {
  if (state.loading && !state.data) return <Spinner />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  return children(state.data);
}
export const InlineAlert = ({ tone = 'medium', children }) => {
  const c = { medium: 'bg-medium-bg text-medium-fg', critical: 'bg-critical-bg text-critical-fg', success: 'bg-success-bg text-success-fg' }[tone];
  return <div role="alert" className={`rounded-lg px-3 py-2 text-sm ${c}`}>{children}</div>;
};
