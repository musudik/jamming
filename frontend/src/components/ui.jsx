// Small shared UI primitives to keep pages readable.
// Themed to the Telugu Jamming Munich palette: deep teal surfaces, warm orange accent.

export function Button({ variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-brand hover:bg-brand-light text-onbrand font-semibold",
    secondary: "bg-raised hover:bg-line text-cream",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "bg-transparent hover:bg-surface text-muted hover:text-cream",
  };
  return (
    <button
      className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>}
      <input
        className={`min-h-[44px] w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-cream placeholder:text-muted/60 outline-none focus:border-brand focus:ring-1 focus:ring-brand ${className}`}
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>}
      <textarea
        className={`w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-cream placeholder:text-muted/60 outline-none focus:border-brand focus:ring-1 focus:ring-brand ${className}`}
        {...props}
      />
    </label>
  );
}

export function Spinner({ label = "Loading…" }) {
  return <div className="p-8 text-center text-muted">{label}</div>;
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-500/50 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-200">
      {message}
    </div>
  );
}

export function Logo({ className = "h-16" }) {
  return (
    <img
      src="/assets/Logo.png"
      alt="Telugu Jamming Munich"
      className={`mx-auto w-auto ${className}`}
    />
  );
}
