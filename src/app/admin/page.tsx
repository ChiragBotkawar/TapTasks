import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { AdminBooks } from "@/components/admin-books";
import { AdminUsers } from "@/components/admin-users";
import type { Book, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  const supabase = await createClient();
  const [{ data: books }, { data: users }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, description, cover, storage_path, status, amazon_link, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, phone, name, role, created_at, last_login")
      .order("last_login", { ascending: false }),
  ]);

  return (
    <div className="min-h-full">
      <Header
        userName={profile?.name ?? null}
        phone={profile?.phone ?? null}
        isAdmin={isAdmin}
      />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-1 text-sm text-[--muted]">
            Manage books and registered readers.
          </p>
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-[--border] bg-white px-6 py-16 text-center">
            <p className="text-sm text-[--muted]">
              You do not have permission to access this page.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="animate-fade-in-up flex items-center gap-4 rounded-2xl border border-[--border] bg-white p-4 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-xl">
                  📚
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[--muted]">
                    Total books
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-teal-700">
                    {(books ?? []).length}
                  </p>
                </div>
              </div>
              <div className="animate-fade-in-up flex items-center gap-4 rounded-2xl border border-[--border] bg-white p-4 shadow-sm" style={{ animationDelay: "0.08s" }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-xl">
                  ✅
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[--muted]">
                    Active books
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-teal-700">
                    {(books ?? []).filter((b) => b.status === "active").length}
                  </p>
                </div>
              </div>
              <div className="animate-fade-in-up flex items-center gap-4 rounded-2xl border border-[--border] bg-white p-4 shadow-sm" style={{ animationDelay: "0.16s" }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600/10 text-xl">
                  👥
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[--muted]">
                    Total readers
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-teal-700">
                    {(users ?? []).filter((u) => u.role !== "admin").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-10">
              <AdminBooks books={(books as Book[]) ?? []} />
              <AdminUsers users={(users as Profile[]) ?? []} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}