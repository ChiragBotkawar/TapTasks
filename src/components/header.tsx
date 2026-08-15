"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";

type HeaderProps = {
  userName: string | null;
  phone: string | null;
  isAdmin: boolean;
};

export function Header({ userName, phone, isAdmin }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const linkCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-teal-600/10 text-teal-800"
        : "text-[--muted] hover:bg-stone-100 hover:text-[--foreground]"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-[--border]/70 bg-[--background]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/library" className="group flex items-center gap-2.5">
            <Logo className="transition-transform duration-200 group-hover:scale-105" />
            <span className="text-base font-semibold tracking-tight">TapTasks</span>
          </Link>          <nav className="ml-4 flex items-center gap-1">
            <Link href="/library" className={linkCls(pathname === "/library")}>
              Library
            </Link>
            {isAdmin && (
              <Link href="/admin" className={linkCls(pathname === "/admin")}>
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-stone-700 to-stone-900 text-xs font-semibold text-white transition-transform duration-200 hover:scale-110">
              {(userName ?? phone ?? "U").trim().charAt(0).toUpperCase()}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium">{userName ?? "Reader"}</p>
              {phone && <p className="text-xs text-[--muted]">{phone}</p>}
            </div>
          </div>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="rounded-lg border border-[--border] px-3 py-1.5 text-sm font-medium text-[--foreground] transition hover:border-stone-300 hover:bg-white disabled:opacity-50"
          >
            {signingOut ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}