import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BookCard } from "@/components/book-card";
import type { Book } from "@/lib/types";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, description, cover, storage_path, status, amazon_link, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const list = (books as Book[]) ?? [];
  const firstName = profile?.name?.trim().split(" ")[0] ?? "Reader";

  return (
    <div className="min-h-full">
      <Header
        userName={profile?.name ?? null}
        phone={profile?.phone ?? null}
        isAdmin={profile?.role === "admin"}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-fade-in-up relative mb-8 overflow-hidden rounded-3xl border border-teal-600/15 bg-gradient-to-br from-teal-600 to-emerald-600 px-6 py-8 text-white shadow-lg shadow-teal-900/10 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-white/10 blur-2xl"
          />
          <span
            aria-hidden
            className="animate-float pointer-events-none absolute right-6 top-6 hidden text-5xl opacity-30 sm:block"
          >
            📚
          </span>
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-100/90">
            Welcome back
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName}, your library awaits.
          </h1>
          <p className="mt-2 max-w-md text-sm text-teal-50/90">
            {list.length === 0
              ? "New books will show up here as soon as they are uploaded."
              : `${list.length} book${list.length === 1 ? "" : "s"} available — pick one and continue reading.`}
          </p>
        </div>

        <div className="animate-fade-in-up mb-5 flex items-center justify-between" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-semibold tracking-tight">Library</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[--border] bg-white px-3 py-1 text-xs font-medium text-[--muted]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {list.length} available
          </span>
        </div>

        {list.length === 0 ? (
          <div className="animate-fade-in rounded-3xl border border-dashed border-[--border] bg-white/70 px-6 py-20 text-center">
            <div className="animate-float mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600/10 text-2xl">
              📚
            </div>
            <p className="text-sm font-medium">No books available yet</p>
            <p className="mt-1 text-sm text-[--muted]">
              New books will show up here as soon as they are uploaded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.map((book, i) => (
              <div
                key={book.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
              >
                <BookCard book={book} />
              </div>
            ))}
          </div>
        )}

        <section className="animate-fade-in-up mt-12" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-lg font-semibold tracking-tight">
            Explore other books by Harish
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a
              href="https://amzn.in/d/0gbQUaoP"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[--border] bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600/30 hover:shadow-md"
            >
              <span className="text-sm font-medium text-stone-800 transition group-hover:text-teal-800">
                Democracy Misunderstood: Need to Revisit our Democracy
              </span>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-[--muted] transition group-hover:text-teal-700"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 111.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <a
              href="https://amzn.in/d/0bf5q6XX"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[--border] bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600/30 hover:shadow-md"
            >
              <span className="text-sm font-medium text-stone-800 transition group-hover:text-teal-800">
                Roadmap to Change India
              </span>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-[--muted] transition group-hover:text-teal-700"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 111.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
