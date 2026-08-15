import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Viewport } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Reader } from "@/components/reader";
import type { Book } from "@/lib/types";

export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
};

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, author, description, cover, storage_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!book) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  if (book.status !== "active" && !isAdmin) notFound();

  const { data: progress } = await supabase
    .from("reading_progress")
    .select("current_page")
    .eq("user_id", user.id)
    .eq("book_id", id)
    .maybeSingle();

  return (
    <Reader
      book={book as Book}
      initialPage={progress?.current_page ?? 1}
      pdfUrl={`/api/books/${book.id}/pdf`}
    />
  );
}