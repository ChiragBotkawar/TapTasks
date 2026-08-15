import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";
import { Logo } from "@/components/logo";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  const sessionReady = !!user;

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl"
        style={{ animationDelay: "6s" }}
      />

      <div className="w-full max-w-sm">
        <div className="animate-fade-in-up mb-8 flex flex-col items-center text-center">
          <Logo className="h-14 w-14 rounded-2xl text-2xl" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-1 text-sm text-[--muted]">
            Choose a new password for your account.
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
          <ResetPasswordForm sessionReady={sessionReady} />
        </div>
      </div>
    </main>
  );
}
