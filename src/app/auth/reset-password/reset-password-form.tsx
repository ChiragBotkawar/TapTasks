"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";

export function ResetPasswordForm({ sessionReady }: { sessionReady: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-[--border] bg-stone-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-[--accent] focus:bg-white focus:ring-2 focus:ring-teal-500/15";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to reset password.");
        return;
      }
      setDone(true);
      router.push("/library");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!sessionReady) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
          ⚠️
        </div>
        <p className="text-sm text-[--muted]">
          This reset link is invalid or has expired. Please request a new one
          from the login page.
        </p>
        <Link
          href="/"
          className="inline-block w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition hover:brightness-105 active:scale-[0.99]"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {done && (
        <p className="animate-fade-in rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          Password updated successfully. Taking you to your library…
        </p>
      )}

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <PasswordInput
          id="password"
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
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm"
          value={confirm}
          onChange={setConfirm}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? "Saving…" : "Update password"}
      </button>

      {error && (
        <p className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
