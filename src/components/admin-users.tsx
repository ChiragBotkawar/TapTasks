"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";

export function AdminUsers({ users }: { users: Profile[] }) {
  const [exporting, setExporting] = useState(false);

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/users/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "readers.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export.");
    } finally {
      setExporting(false);
    }
  }

  const readers = users.filter((u) => u.role !== "admin");

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-lg">
            👥
          </span>
          <div>
            <h2 className="text-lg font-semibold">Registered users</h2>
            <p className="text-sm text-[--muted]">
              Total readers:{" "}
              <span className="font-bold text-teal-700">{readers.length}</span>
            </p>
          </div>
        </div>
        <button
          onClick={exportExcel}
          disabled={exporting || users.length === 0}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting ? "Preparing…" : "Export to Excel"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[--border] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-[--border] bg-stone-50/60 text-left text-xs font-medium uppercase tracking-wide text-[--muted]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Login Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[--muted]">
                    No users have logged in yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[--border] transition last:border-0 hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-600 to-stone-800 text-xs font-semibold text-white">
                          {(user.name ?? user.email ?? user.phone ?? "U")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        {user.name ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{user.email ?? "—"}</td>
                    <td className="px-4 py-3">{user.phone ?? "—"}</td>
                    <td className="px-4 py-3">{user.city ?? "—"}</td>
                    <td className="px-4 py-3 text-[--muted]">
                      {user.last_login ? new Date(user.last_login).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                          user.role === "admin"
                            ? "bg-teal-50 text-teal-700 ring-teal-600/20"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.role === "admin" ? "bg-teal-500" : "bg-emerald-500"
                          }`}
                        />
                        {user.role === "admin" ? "Admin" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}