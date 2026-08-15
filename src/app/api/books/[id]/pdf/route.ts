import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/books/[id]/pdf">
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, storage_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!book) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  if (book.status !== "active" && !isAdmin) {
    return new NextResponse("Not available", { status: 403 });
  }

  const { data: file, error } = await supabase.storage
    .from("books")
    .download(book.storage_path);

  if (error || !file) {
    console.error("Failed to download book file", error);
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="book.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}