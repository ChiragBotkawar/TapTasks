import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

const FLOATERS = [
  { emoji: "📖", cls: "left-[8%] top-[16%] text-3xl", delay: "0s" },
  { emoji: "📚", cls: "right-[10%] top-[22%] text-4xl", delay: "1.2s" },
  { emoji: "✨", cls: "left-[16%] bottom-[18%] text-2xl", delay: "0.6s" },
  { emoji: "🔖", cls: "right-[18%] bottom-[24%] text-2xl", delay: "1.8s" },
];

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/library");

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* animated gradient blobs */}
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl"
        style={{ animationDelay: "6s" }}
      />

      {/* subtle grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(13,148,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
        }}
      />

      {/* floating book icons */}
      {FLOATERS.map((f) => (
        <span
          key={f.emoji}
          aria-hidden
          className={`animate-float-slow pointer-events-none absolute hidden select-none opacity-40 drop-shadow-lg sm:block ${f.cls}`}
          style={{ animationDelay: f.delay }}
        >
          {f.emoji}
        </span>
      ))}

      <div className="w-full max-w-sm">
        <div className="animate-fade-in-up mb-8 flex flex-col items-center text-center">
          <div className="relative">
            <Logo className="h-16 w-16 rounded-2xl text-3xl" />
            <span
              aria-hidden
              className="absolute -inset-2 -z-10 rounded-3xl bg-teal-500/20 blur-xl"
            />
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-teal-600/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
            Private digital reading library
          </span>
          <h1 className="shimmer-text mt-3 text-3xl font-bold tracking-tight">
            TapTasks
          </h1>
          <p className="mt-2 text-sm text-[--muted]">
            Read in-app only — no downloads, no printing.
          </p>
        </div>

        <div
          className="animate-fade-in-up relative rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-stone-900/5 backdrop-blur"
          style={{ animationDelay: "0.15s" }}
        >
          <span
            aria-hidden
            className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/60 to-transparent"
          />
          <LoginForm />
        </div>

        <p className="animate-fade-in-up mt-6 text-center text-xs text-[--muted]">
          By continuing you agree to keep books private and personal.
        </p>
      </div>
    </main>
  );
}
