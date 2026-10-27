const VARIANTS = {
  primary: 'bg-teal text-white hover:bg-teal-dark', // main action only
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
  ghost: 'text-teal hover:bg-teal/10',
};
export default function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}
