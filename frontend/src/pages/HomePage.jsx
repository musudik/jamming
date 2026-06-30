import { Link } from "react-router-dom";
import { Logo } from "../components/ui.jsx";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo className="h-44 drop-shadow-[0_0_25px_rgba(229,130,30,0.25)]" />
      <p className="-mt-2 text-muted">
        Scan an event QR code to browse songs and follow the lyrics.
      </p>
      <Link
        to="/admin"
        className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm text-muted transition hover:border-brand hover:text-cream"
      >
        Event admin →
      </Link>
    </div>
  );
}
