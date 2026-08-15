"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";

export function LoginForm() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [view, setView] = useState<"signin" | "forgot">("signin");
  const [step, setStep] = useState<"form" | "sent">("form");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-xl border border-[--border] bg-stone-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-[--accent] focus:bg-white focus:ring-2 focus:ring-teal-500/15";

  const submitCls =
    "w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition hover:shadow-lg hover:shadow-teal-600/30 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

  function friendlyError(raw: string): string {
    if (/fetch failed|failed to fetch|enotfound|getaddrinfo|network/i.test(raw)) {
      return "Could not reach Supabase. Check your NEXT_PUBLIC_SUPABASE_URL / ANON_KEY in .env.local";
    }
    if (/smtp|rate limit|email.*not/i.test(raw)) {
      return "Email sending failed. Supabase's built-in email is rate-limited; try again in a few minutes or check your inbox spam folder.";
    }
    if (/email not confirmed|confirm your email/i.test(raw)) {
      return "Please verify your email first — check your inbox (and spam) and click the confirmation link.";
    }
    if (/invalid login credentials/i.test(raw)) {
      return "Incorrect email or password. Please try again.";
    }
    return raw;
  }

  function switchMode(next: "signin" | "register") {
    setMode(next);
    setView("signin");
    setStep("form");
    setError(null);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(friendlyError(data.error ?? "Login failed."));
        return;
      }
      router.push("/library");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please enter your full name.");
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) return setError("Phone number must be exactly 10 digits.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("A valid email address is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: digits, email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(friendlyError(data.error ?? "Registration failed."));
        return;
      }
      if (data.signedIn) {
        router.push("/library");
        router.refresh();
        return;
      }
      setStep("sent");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return setError("A valid email address is required.");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(friendlyError(data.error ?? "Failed to send reset link."));
        return;
      }
      setStep("sent");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const tabCls = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-teal-600 text-white shadow-sm" : "text-[--muted] hover:text-[--foreground]"
    }`;

  const heading =
    view === "forgot"
      ? { title: "Forgot password?", subtitle: "Enter your email and we'll send you a reset link." }
      : mode === "register"
        ? step === "sent"
          ? { title: "Check your email", subtitle: `A confirmation link was sent to ${email}.` }
          : { title: "Create your account", subtitle: "Register once, then sign in with your password." }
        : { title: "Welcome back", subtitle: "Sign in with your email and password." };

  return (
    <div className="space-y-4">
      {/* Register / Sign in tabs */}
      {view === "signin" && step !== "sent" && (
        <div className="flex rounded-xl border border-[--border] p-1 text-sm font-medium">
          <button type="button" onClick={() => switchMode("signin")} className={tabCls(mode === "signin")}>
            Sign in
          </button>
          <button type="button" onClick={() => switchMode("register")} className={tabCls(mode === "register")}>
            Create account
          </button>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-lg font-semibold tracking-tight">{heading.title}</h2>
        <p className="mt-1 text-sm text-[--muted]">{heading.subtitle}</p>
      </div>

      {/* FORGOT PASSWORD */}
      {view === "forgot" ? (
        step === "sent" ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-teal-50 px-3.5 py-3 text-sm text-teal-900">
              <p className="font-medium">Password reset link sent to {email}</p>
              <p className="mt-0.5 text-xs text-teal-700">
                Check your inbox (and spam folder) and click the link to choose a new password. It expires shortly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setView("signin");
              }}
              className="w-full text-center text-sm font-medium text-[--muted] transition hover:text-[--foreground]"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={sendReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls}
              />
            </div>
            <button type="submit" disabled={loading} className={submitCls}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setView("signin");
              }}
              className="w-full text-center text-sm font-medium text-[--muted] transition hover:text-[--foreground]"
            >
              ← Back to sign in
            </button>
          </form>
        )
      ) : // REGISTER — sent step
      mode === "register" && step === "sent" ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-teal-50 px-3.5 py-3 text-sm text-teal-900">
            <p className="font-medium">Confirmation link sent to {email}</p>
            <p className="mt-0.5 text-xs text-teal-700">
              Click the link in your inbox (check spam too) to verify your account. It expires shortly and can only be used once.
            </p>
          </div>
          <button type="button" disabled={loading} onClick={register} className={submitCls}>
            {loading ? "Sending…" : "Resend link"}
          </button>
          <button
            type="button"
            onClick={() => setStep("form")}
            className="w-full text-center text-sm font-medium text-[--muted] transition hover:text-[--foreground]"
          >
            ← Change details
          </button>
        </div>
      ) : // REGISTER — form
      mode === "register" ? (
        <form onSubmit={register} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
              Phone number <span className="font-normal text-[--muted]">(10 digits)</span>
            </label>
            <div className="flex items-center gap-0">
              <span className="rounded-l-xl border border-r-0 border-[--border] bg-stone-100 px-3 py-2.5 text-sm text-[--muted]">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                required
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                autoComplete="tel-national"
                className={`${inputCls} rounded-l-none`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="reg-password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium">
              Confirm password
            </label>
            <PasswordInput
              id="reg-confirm"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputCls}
            />
          </div>

          <button type="submit" disabled={loading} className={submitCls}>
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Creating account…
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>
      ) : (
        // SIGN IN — form
        <form onSubmit={signIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputCls}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("form");
                  setView("forgot");
                }}
                className="text-xs font-semibold text-teal-700 transition hover:text-teal-800"
              >
                Forgot password?
              </button>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              autoComplete="current-password"
              minLength={6}
              required
              className={inputCls}
            />
          </div>

          <button type="submit" disabled={loading} className={submitCls}>
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      )}

      {error && (
        <p className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
